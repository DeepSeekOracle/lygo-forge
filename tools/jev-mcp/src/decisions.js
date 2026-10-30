import { z } from 'zod';

const text = z.string().trim().min(1).max(4000);
const label = z.string().regex(/^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/);
const probability = z.number().finite().min(0).max(1);
const criteria = z.record(label, text).refine(v => Object.keys(v).length >= 2 && Object.keys(v).length <= 32);
const common = { state: z.string().trim().min(1).max(16000), instructions: text };
export const inputs = {
  jev_yes_no: z.object({ ...common, criteria: z.object({ true: text, false: text }).strict().optional() }).strict(),
  jev_choose: z.object({ ...common, criteria }).strict(),
  jev_score: z.object({ ...common, criteria: z.array(text).min(2).max(32) }).strict(),
};
export const answers = {
  jev_yes_no: z.object({ type: z.literal('noul'), noul: probability }),
  jev_choose: z.object({ type: z.literal('choice'), choice: label, confidence: probability, probabilities: z.record(label, probability) }),
  jev_score: z.object({ type: z.literal('score'), score: z.number().finite().min(0), confidence: probability, probabilities: z.record(z.string(), probability), legend: z.record(z.string(), text) }),
};
const usage = z.object({ input_tokens: z.number().int().nonnegative(), output_tokens: z.number().int().nonnegative() });
export const outputs = Object.fromEntries(Object.entries(answers).map(([name, answer]) => [name,
  z.object({ model: z.string().regex(/^[a-zA-Z0-9._-]{1,100}$/), answer, usage }),
]));
const kinds = { jev_yes_no: 'noul', jev_choose: 'choice', jev_score: 'score' };
const messages = {
  INVALID_INPUT: 'Invalid decision input. Check the tool schema and size limits.',
  NOT_CONFIGURED: 'Set TYPESAFE_API_KEY in the server environment before calling Jev.',
  AUTHENTICATION: 'TypeSafe rejected the server credential. Check it privately.',
  RATE_LIMITED: 'TypeSafe rate limit reached. Try again later.',
  UNAVAILABLE: 'TypeSafe is unavailable or the request failed. Try again later.',
  TIMEOUT: 'TypeSafe request timed out.',
  INVALID_RESPONSE: 'TypeSafe returned an unexpected response.',
  BUSY: 'The connector is busy. Try again after an active call finishes.',
};
export class DecisionError extends Error {
  constructor(code) { super(messages[code]); this.code = code; }
}
export function safeError(error) {
  return error instanceof DecisionError ? { code: error.code, message: error.message }
    : { code: 'UNAVAILABLE', message: messages.UNAVAILABLE };
}

async function readJson(response) {
  if (!response.body) throw new DecisionError('INVALID_RESPONSE');
  const reader = response.body.getReader();
  const chunks = [];
  let bytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 262144) throw new DecisionError('INVALID_RESPONSE');
      chunks.push(Buffer.from(value));
    }
    try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
    catch { throw new DecisionError('INVALID_RESPONSE'); }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}

function validateAnswer(name, raw, input) {
  const parsed = answers[name].safeParse(raw);
  if (!parsed.success) throw new DecisionError('INVALID_RESPONSE');
  const answer = parsed.data;
  if (name === 'jev_yes_no') return answer;
  const expected = name === 'jev_choose' ? Object.keys(input.criteria) : input.criteria.map((_, i) => String(i));
  const keys = Object.keys(answer.probabilities);
  if (keys.length !== expected.length || expected.some(k => !Object.hasOwn(answer.probabilities, k)) ||
      Math.abs(Object.values(answer.probabilities).reduce((a, b) => a + b, 0) - 1) > 0.01) {
    throw new DecisionError('INVALID_RESPONSE');
  }
  if (name === 'jev_choose') {
    if (!expected.includes(answer.choice) || answer.probabilities[answer.choice] + 0.0001 < Math.max(...Object.values(answer.probabilities))) {
      throw new DecisionError('INVALID_RESPONSE');
    }
  } else {
    const weighted = expected.reduce((sum, k) => sum + Number(k) * answer.probabilities[k], 0);
    if (answer.score > expected.length - 1 || Math.abs(weighted - answer.score) > 0.02 ||
        Object.keys(answer.legend).length !== expected.length || expected.some(k => answer.legend[k] !== input.criteria[Number(k)])) {
      throw new DecisionError('INVALID_RESPONSE');
    }
  }
  return answer;
}

export function createDecisionClient({ apiKey = process.env.TYPESAFE_API_KEY, model = process.env.TYPESAFE_MODEL ?? 'jev-latest', fetchImpl = globalThis.fetch, timeoutMs = 20000 } = {}) {
  let active = 0;
  return async function decide(name, args, signal) {
    const parsed = inputs[name]?.safeParse(args);
    if (!parsed?.success) throw new DecisionError('INVALID_INPUT');
    if (!apiKey || !/^[\x21-\x7e]{1,4096}$/.test(apiKey) || !/^[a-zA-Z0-9._-]{1,100}$/.test(model)) throw new DecisionError('NOT_CONFIGURED');
    if (active >= 4) throw new DecisionError('BUSY');
    active++;
    const timeout = AbortSignal.timeout(timeoutMs);
    try {
      const input = parsed.data;
      const question = { type: kinds[name], instructions: input.instructions };
      if (input.criteria) question.criteria = input.criteria;
      const response = await fetchImpl('https://api.typesafe.ai/v1/systemone', {
        method: 'POST', redirect: 'error',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ model, state: input.state, questions: { decision: question } }),
        signal: signal ? AbortSignal.any([timeout, signal]) : timeout,
      });
      if (!response.ok) {
        await response.body?.cancel().catch(() => {});
        throw new DecisionError(response.status === 401 || response.status === 403 ? 'AUTHENTICATION' : response.status === 429 ? 'RATE_LIMITED' : 'UNAVAILABLE');
      }
      const raw = await readJson(response);
      const answer = validateAnswer(name, raw?.answers?.decision, input);
      const output = outputs[name].safeParse({ model: raw?.model, answer, usage: raw?.usage });
      if (!output.success) throw new DecisionError('INVALID_RESPONSE');
      return output.data;
    } catch (error) {
      if (error instanceof DecisionError) throw error;
      throw new DecisionError(timeout.aborted ? 'TIMEOUT' : 'UNAVAILABLE');
    } finally { active--; }
  };
}
