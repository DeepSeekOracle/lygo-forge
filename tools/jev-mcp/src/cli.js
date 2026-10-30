import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createServer } from './server.js';
import { createLocalHttpServer } from './http.js';

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    const server = createServer();
    await server.connect(new StdioServerTransport());
    for (const event of ['SIGTERM', 'SIGINT']) process.once(event, () => { void server.close().finally(() => process.exit(0)); });
  } else if (args.length === 1 && args[0] === '--http') {
    const port = Number(process.env.JEV_MCP_PORT ?? 8787);
    if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error();
    const server = createLocalHttpServer();
    server.on('error', () => { process.stderr.write('Unable to start local HTTP transport. Check token and port settings.\n'); process.exitCode = 1; });
    server.listen(port, '127.0.0.1', () => process.stderr.write('Jev MCP HTTP transport listening on loopback.\n'));
    for (const event of ['SIGTERM', 'SIGINT']) process.once(event, () => { server.closeAllConnections(); server.close(); });
  } else throw new Error();
}
main().catch(() => { process.stderr.write('Jev MCP could not start. Use no arguments for stdio or --http with JEV_MCP_TOKEN and a valid JEV_MCP_PORT.\n'); process.exitCode = 1; });
