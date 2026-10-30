// Explicit opt-in only: this script makes billable requests when given a real key.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function smoke() {
  if (!process.env.TYPESAFE_API_KEY) {
    process.stderr.write('Set TYPESAFE_API_KEY privately before running the live smoke test.\n');
    process.exitCode = 1; return;
  }
  const inputs = JSON.parse(await readFile(new URL('./decisions.json', import.meta.url), 'utf8'));
  const client = new Client({ name: 'jev-live-smoke', version: '0.1.0' });
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [fileURLToPath(new URL('../src/cli.js', import.meta.url))],
    env: { TYPESAFE_API_KEY: process.env.TYPESAFE_API_KEY, TYPESAFE_MODEL: process.env.TYPESAFE_MODEL ?? 'jev-latest' },
    stderr: 'pipe',
  });
  // Drain stderr without exposing child/provider details.
  transport.stderr?.resume();
  try {
    await client.connect(transport);
    const tools = (await client.listTools()).tools;
    for (const [name, args] of Object.entries(inputs)) {
      if (!tools.some(tool => tool.name === name)) throw new Error();
      const result = await client.callTool({ name, arguments: args });
      if (result.isError || !result.structuredContent?.answer) throw new Error();
      process.stdout.write(`${name}: passed\n`);
    }
  } finally { await client.close(); }
}
smoke().catch(() => {
  process.stderr.write('Live smoke test failed. Check the private server credential and provider availability.\n');
  process.exitCode = 1;
});
