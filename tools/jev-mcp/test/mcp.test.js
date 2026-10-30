import test from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { createServer } from '../src/server.js';
import { createDecisionClient } from '../src/decisions.js';
import { createLocalHttpServer } from '../src/http.js';

const input = { state: 'The parcel arrived today.', instructions: 'Did the parcel arrive?' };
const token = 'mock-local-token-never-a-real-token';
const mockDecide = createDecisionClient({ apiKey: 'mock-key', fetchImpl: async (_, init) => {
  const q = JSON.parse(init.body).questions.decision;
  const answer = q.type === 'noul' ? { type: 'noul', noul: 0.99 }
    : q.type === 'choice' ? { type: 'choice', choice: 'arrived', confidence: 1, probabilities: { arrived: 1, other: 0 } }
    : { type: 'score', score: 1, confidence: 1, probabilities: { 0: 0, 1: 1 }, legend: { 0: 'Not arrived', 1: 'Arrived' } };
  return Response.json({ model: 'jev-test', answers: { decision: answer }, usage: { input_tokens: 10, output_tokens: 2 } });
} });
test('real SDK initialize, list, annotations, all tools and schema rejection', async t => {
  const [serverTransport, clientTransport] = InMemoryTransport.createLinkedPair();
  const server = createServer({ decide: mockDecide });
  const client = new Client({ name: 'offline-test', version: '1' });
  t.after(async () => { await client.close(); await server.close(); });
  await server.connect(serverTransport); await client.connect(clientTransport);
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map(t => t.name).sort(), ['jev_choose', 'jev_score', 'jev_yes_no']);
  assert.ok(tools.every(t => t.annotations.openWorldHint && t.annotations.readOnlyHint && t.outputSchema));
  for (const [name, args] of [
    ['jev_yes_no', input],
    ['jev_choose', { ...input, criteria: { arrived: 'Parcel arrived', other: 'Other' } }],
    ['jev_score', { ...input, criteria: ['Not arrived', 'Arrived'] }],
  ]) {
    const result = await client.callTool({ name, arguments: args });
    assert.ok(!result.isError); assert.equal(result.structuredContent.model, 'jev-test');
  }
  const invalid = await client.callTool({ name: 'jev_yes_no', arguments: { ...input, state: '' } });
  assert.equal(invalid.isError, true);
});
test('stdio subprocess discovers tools without a key and returns safe missing-key error', async t => {
  const transport = new StdioClientTransport({ command: process.execPath, args: ['src/cli.js'], cwd: process.cwd(), env: { TYPESAFE_API_KEY: '' }, stderr: 'pipe' });
  const client = new Client({ name: 'stdio-test', version: '1' });
  let stderr = ''; transport.stderr?.on('data', chunk => { stderr += chunk; });
  t.after(() => client.close());
  await client.connect(transport);
  assert.equal((await client.listTools()).tools.length, 3);
  const result = await client.callTool({ name: 'jev_yes_no', arguments: input });
  assert.equal(result.isError, true);
  assert.equal(JSON.parse(result.content[0].text).code, 'NOT_CONFIGURED');
  assert.equal(stderr, '');
});
test('HTTP refuses missing/weak transport token', () => {
  assert.throws(() => createLocalHttpServer({ token: '' }));
  assert.throws(() => createLocalHttpServer({ token: 'short' }));
});
test('loopback HTTP authenticates and speaks MCP; rejects browser origins and oversized bodies', async t => {
  const server = createLocalHttpServer({ token, decide: mockDecide });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  t.after(() => { server.closeAllConnections(); return new Promise(resolve => server.close(resolve)); });
  const url = new URL(`http://127.0.0.1:${server.address().port}/mcp`);
  for (const headers of [{}, { Authorization: 'Bearer wrong' }]) assert.equal((await fetch(url, { headers })).status, 401);
  const auth = { Authorization: `Bearer ${token}` };
  assert.equal((await fetch(url, { headers: { ...auth, Origin: 'https://example.invalid' } })).status, 403);
  const badHostStatus = await new Promise((resolve, reject) => {
    const req = request(url, { headers: { ...auth, Host: 'evil.invalid' } }, res => { res.resume(); resolve(res.statusCode); });
    req.on('error', reject); req.end();
  });
  assert.equal(badHostStatus, 403);
  assert.equal((await fetch(url, { headers: auth })).status, 405);
  assert.equal((await fetch(new URL('/wrong', url), { headers: auth })).status, 404);
  assert.equal((await fetch(url, { method: 'POST', headers: auth, body: '{}' })).status, 415);
  const jsonHeaders = { ...auth, 'Content-Type': 'application/json' };
  assert.equal((await fetch(url, { method: 'POST', headers: jsonHeaders, body: '{bad' })).status, 400);
  assert.equal((await fetch(url, { method: 'POST', headers: jsonHeaders, body: 'x'.repeat(131073) })).status, 413);
  const client = new Client({ name: 'http-test', version: '1' });
  t.after(() => client.close());
  await client.connect(new StreamableHTTPClientTransport(url, { requestInit: { headers: auth } }));
  assert.equal((await client.listTools()).tools.length, 3);
  const result = await client.callTool({ name: 'jev_yes_no', arguments: input });
  assert.equal(result.structuredContent.answer.noul, 0.99);
});
