import test from 'node:test';
import assert from 'node:assert/strict';
import { createDecisionClient, safeError } from '../src/decisions.js';

const fakeKey = 'mock-key-never-valid';
const common = { state: 'The delivery is delayed.', instructions: 'Is the delivery late?' };
const usage = { input_tokens: 12, output_tokens: 4 };
const noul = { type: 'noul', noul: 0.9 };
const choiceInput = { ...common, criteria: { late: 'Late delivery', other: 'Anything else' } };
const scoreInput = { ...common, criteria: ['On time', 'Slightly late', 'Very late'] };
const choice = { type: 'choice', choice: 'late', confidence: 0.8, probabilities: { late: 0.9, other: 0.1 } };
const score = { type: 'score', score: 1.4, confidence: 0.3, probabilities: { 0: 0, 1: 0.6, 2: 0.4 }, legend: { 0: 'On time', 1: 'Slightly late', 2: 'Very late' } };
const payload = answer => ({ model: 'jev-test', answers: { decision: answer }, usage });
const client = (answer, options = {}) => createDecisionClient({ apiKey: fakeKey, fetchImpl: async () => Response.json(payload(answer)), ...options });

test('fixed endpoint, bearer header, documented request and stripped output', async () => {
  let request;
  const decide = client(noul, { fetchImpl: async (url, init) => {
    request = { url, init }; return Response.json({ ...payload({ ...noul, private_debug: fakeKey }), secret: fakeKey });
  } });
  const result = await decide('jev_yes_no', common);
  assert.equal(request.url, 'https://api.typesafe.ai/v1/systemone');
  assert.equal(request.init.redirect, 'error');
  assert.equal(request.init.headers.Authorization, `Bearer ${fakeKey}`);
  assert.deepEqual(JSON.parse(request.init.body), { model: 'jev-latest', state: common.state, questions: { decision: { type: 'noul', instructions: common.instructions } } });
  assert.deepEqual(result, { model: 'jev-test', answer: noul, usage });
  assert.ok(!JSON.stringify(result).includes(fakeKey));
});
test('choice and score retain typed distributions', async () => {
  assert.deepEqual((await client(choice)('jev_choose', choiceInput)).answer, choice);
  assert.deepEqual((await client(score)('jev_score', scoreInput)).answer, score);
});
test('yes/no criteria and score levels map unchanged to API criteria', async () => {
  for (const [name, input, answer] of [
    ['jev_yes_no', { ...common, criteria: { true: 'Delivery overdue', false: 'Delivery on time' } }, noul],
    ['jev_choose', choiceInput, choice], ['jev_score', scoreInput, score],
  ]) {
    const decide = client(answer, { fetchImpl: async (_, init) => {
      assert.deepEqual(JSON.parse(init.body).questions.decision.criteria, input.criteria);
      return Response.json(payload(answer));
    } });
    await decide(name, input);
  }
});
test('invalid inputs never make network calls', async () => {
  let calls = 0;
  const decide = client(noul, { fetchImpl: async () => { calls++; throw new Error(); } });
  for (const [name, input] of [
    ['unknown', common], ['jev_yes_no', { ...common, state: '' }],
    ['jev_yes_no', { ...common, state: 'x'.repeat(16001) }],
    ['jev_yes_no', { ...common, endpoint: 'https://example.invalid' }],
    ['jev_choose', { ...common, criteria: { only: 'Only one' } }],
    ['jev_choose', { ...common, criteria: { 'invalid label': 'A', other: 'B' } }],
    ['jev_score', { ...common, criteria: Array(33).fill('level') }],
  ]) await assert.rejects(decide(name, input), { code: 'INVALID_INPUT' });
  assert.equal(calls, 0);
});
test('missing credential fails without a request', async () => {
  await assert.rejects(client(noul, { apiKey: '' })('jev_yes_no', common), { code: 'NOT_CONFIGURED' });
});
for (const [status, code] of [[401, 'AUTHENTICATION'], [403, 'AUTHENTICATION'], [429, 'RATE_LIMITED'], [500, 'UNAVAILABLE'], [400, 'UNAVAILABLE'], [302, 'UNAVAILABLE']]) {
  test(`HTTP ${status} is safe and never retried`, async () => {
    let calls = 0;
    const decide = client(noul, { fetchImpl: async () => { calls++; return new Response(fakeKey, { status }); } });
    await assert.rejects(decide('jev_yes_no', common), error => {
      assert.equal(error.code, code); assert.ok(!JSON.stringify(safeError(error)).includes(fakeKey)); return true;
    });
    assert.equal(calls, 1);
  });
}
test('transport exception details are discarded', async () => {
  const decide = client(noul, { fetchImpl: async () => { throw new Error(fakeKey); } });
  await assert.rejects(decide('jev_yes_no', common), error => {
    assert.ok(!JSON.stringify(safeError(error)).includes(fakeKey)); return true;
  });
  assert.equal(safeError(new Error(fakeKey)).code, 'UNAVAILABLE');
});
test('timeout aborts the upstream request', async () => {
  const decide = client(noul, { timeoutMs: 10, fetchImpl: async (_, init) => new Promise((_, reject) => {
    const timer = setTimeout(() => reject(new Error('Timeout did not fire')), 1000);
    init.signal.addEventListener('abort', () => { clearTimeout(timer); reject(init.signal.reason); }, { once: true });
  }) });
  await assert.rejects(decide('jev_yes_no', common), { code: 'TIMEOUT' });
});
test('caller cancellation is forwarded', async () => {
  const controller = new AbortController(); controller.abort();
  const decide = client(noul, { fetchImpl: async (_, init) => { init.signal.throwIfAborted(); } });
  await assert.rejects(decide('jev_yes_no', common, controller.signal), { code: 'UNAVAILABLE' });
});
test('concurrent requests are bounded', async () => {
  const releases = [];
  const decide = client(noul, { fetchImpl: async () => new Promise(resolve => releases.push(() => resolve(Response.json(payload(noul))))) });
  const pending = Array.from({ length: 4 }, () => decide('jev_yes_no', common));
  await assert.rejects(decide('jev_yes_no', common), { code: 'BUSY' });
  releases.forEach(release => release()); await Promise.all(pending);
  const next = decide('jev_yes_no', common); releases.at(-1)(); await next;
});
test('malformed, oversized, mismatched and non-finite provider responses fail closed', async () => {
  const invalid = [
    ['jev_yes_no', common, { type: 'noul', noul: 2 }],
    ['jev_yes_no', common, { type: 'choice', noul: 0.8 }],
    ['jev_yes_no', common, { type: 'noul', noul: null }],
    ['jev_choose', choiceInput, { ...choice, choice: 'missing' }],
    ['jev_choose', choiceInput, { ...choice, probabilities: { late: 0.9 } }],
    ['jev_choose', choiceInput, { ...choice, choice: 'other' }],
    ['jev_choose', choiceInput, { ...choice, probabilities: { late: 0.4, other: 0.1 } }],
    ['jev_score', scoreInput, { ...score, score: 8 }],
    ['jev_score', scoreInput, { ...score, score: 1.8 }],
    ['jev_score', scoreInput, { ...score, legend: { 0: 'secret' } }],
  ];
  for (const [name, input, answer] of invalid) await assert.rejects(client(answer)(name, input), { code: 'INVALID_RESPONSE' });
  for (const body of ['not JSON', 'x'.repeat(262145), JSON.stringify({ answers: {}, model: 'bad model', usage })]) {
    const decide = client(noul, { fetchImpl: async () => new Response(body) });
    await assert.rejects(decide('jev_yes_no', common), { code: 'INVALID_RESPONSE' });
  }
});
