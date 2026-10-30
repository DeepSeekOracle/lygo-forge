import { createServer as createHttpServer } from 'node:http';
import { createHash, timingSafeEqual } from 'node:crypto';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createServer } from './server.js';
import { createDecisionClient } from './decisions.js';

const digest = value => createHash('sha256').update(value).digest();
// Deliberately loopback-only. This is a local bearer-token transport, not OAuth.
export function createLocalHttpServer({ token = process.env.JEV_MCP_TOKEN, decide = createDecisionClient() } = {}) {
  if (!token || !/^[A-Za-z0-9_-]{32,256}$/.test(token)) throw new Error('Set JEV_MCP_TOKEN to a private random token of 32–256 URL-safe characters.');
  const expected = digest(`Bearer ${token}`);
  const server = createHttpServer(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (!/^127\.0\.0\.1(?::\d+)?$/.test(req.headers.host ?? '') || req.headers.origin) {
      res.writeHead(403).end(); return;
    }
    if (!timingSafeEqual(digest(req.headers.authorization ?? ''), expected)) {
      res.setHeader('WWW-Authenticate', 'Bearer'); res.writeHead(401).end(); return;
    }
    if (req.url !== '/mcp') { res.writeHead(404).end(); return; }
    if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); res.writeHead(405).end(); return; }
    if (!/^application\/json(?:\s*;|$)/i.test(req.headers['content-type'] ?? '')) { res.writeHead(415).end(); return; }
    let mcp;
    try {
      let size = 0;
      const chunks = [];
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 131072) { res.writeHead(413).end(); return; }
        chunks.push(chunk);
      }
      let body;
      try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
      catch { res.writeHead(400).end(); return; }
      const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
      mcp = createServer({ decide });
      res.on('close', () => { void mcp.close().catch(() => {}); });
      await mcp.connect(transport);
      await transport.handleRequest(req, res, body);
    } catch {
      if (!res.headersSent) res.writeHead(500).end();
      else res.end();
      await mcp?.close().catch(() => {});
    }
  });
  server.requestTimeout = 30000;
  server.headersTimeout = 10000;
  server.maxConnections = 16;
  return server;
}
