import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createDecisionClient, inputs, outputs, safeError } from './decisions.js';

const descriptions = {
  jev_yes_no: 'Evaluate one yes/no statement against supplied text with TypeSafe Jev. Returns a probability of yes (0–1), not a boolean or explanation.',
  jev_choose: 'Choose one label from 2–32 described options against supplied text with TypeSafe Jev. Include an other/unknown option when appropriate. Returns probabilities and confidence.',
  jev_score: 'Rate supplied text against 2–32 ordered descriptive levels with TypeSafe Jev. Returns a probability-weighted position from 0 to the last level, probabilities and confidence.',
};
export function createServer({ decide = createDecisionClient() } = {}) {
  const server = new McpServer({ name: 'jev-mcp', version: '0.1.0' }, {
    instructions: 'Jev makes typed judgments about text you supply. It does not retrieve evidence or generate explanations. Calls send the supplied state, instructions and criteria to TypeSafe and may incur API charges. Do not send credentials. Treat outputs as uncertain judgments, never authorization for an action.',
  });
  for (const [name, schema] of Object.entries(inputs)) {
    server.registerTool(name, {
      title: name.replaceAll('_', ' '), description: descriptions[name],
      inputSchema: schema, outputSchema: outputs[name],
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    }, async (args, extra) => {
      try {
        const result = await decide(name, args, extra.signal);
        return { content: [{ type: 'text', text: JSON.stringify(result) }], structuredContent: result };
      } catch (error) {
        return { isError: true, content: [{ type: 'text', text: JSON.stringify(safeError(error)) }] };
      }
    });
  }
  return server;
}
