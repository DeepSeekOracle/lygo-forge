# Jev MCP

A small, community-built MCP adapter for [TypeSafe Jev](https://docs.typesafe.ai/introduction/quickstart). MIT licensed; unaffiliated with TypeSafe or OpenAI.

Jev evaluates supplied text and returns structured judgments. This adapter exposes three bounded decision tools, with no search, chat generation, arbitrary HTTP requests, or action execution.

| Tool | Input beyond `state` and `instructions` | Answer |
| --- | --- | --- |
| `jev_yes_no` | Optional `criteria` with `true` and `false` descriptions | `noul`: probability of yes, from 0 to 1 |
| `jev_choose` | `criteria`: 2–32 labels mapped to descriptions | Selected label, probabilities, confidence |
| `jev_score` | `criteria`: 2–32 ordered level descriptions | Fractional score from 0 to the last level, legend, probabilities, confidence |

The [official primitive guide](https://docs.typesafe.ai/primitives) explains these judgments. The connector deliberately accepts text state and string criteria only. Typed answers are model judgments; validate them against your use case before acting.

## Install and test

Requires Node.js 22 or newer and npm.

```sh
git clone https://github.com/asimons81/jev-mcp.git
cd jev-mcp
npm ci --ignore-scripts
npm test
npm run check
```

Tests mock TypeSafe responses, require no real key, and exercise MCP discovery and calls over in-memory, subprocess stdio, and temporary authenticated loopback HTTP transports. HTTP tests require permission to bind loopback. `npm run test:core` runs the decision and stdio tests in environments that prohibit sockets.

**Status:** mocked protocol integration is tested. Live TypeSafe authentication, real Jev answers, Codex registration, ChatGPT account eligibility and ChatGPT tool calls have not been tested. There is no hosted endpoint or npm registry release. `private: true` prevents accidental npm publication; the source is public and MIT licensed.

## Configure credentials privately

Get your own key from the [TypeSafe console](https://console.typesafe.ai/). The server reads `TYPESAFE_API_KEY`; optionally set `TYPESAFE_MODEL` (default `jev-latest`). Tools never accept credentials as arguments. Do not paste keys into chat, examples, source files, command arguments, or MCP config text.

For a temporary interactive terminal session, start Bash and enter the key at its hidden prompt:

```bash
bash
read -r -s -p 'TypeSafe API key: ' TYPESAFE_API_KEY
export TYPESAFE_API_KEY
printf '\n'
```

Launch the MCP host from that environment, or use a trusted credential-manager launcher. GUI apps may not inherit terminal variables. `.env.example` is an empty template; no `.env` is loaded automatically. If you choose an ignored local `.env`, protect its permissions and load it explicitly using your own secure launch setup. Never put the TypeSafe key in client-facing HTTP headers.

Once you have provided your key, `npm run smoke:live` explicitly makes three real requests through MCP stdio using the synthetic examples. It may incur charges. It reports pass/fail without printing the key or upstream responses. It is never run by the test suite or CI.

## Codex: stdio

The default entry point is `node src/cli.js`. Add a server using the Codex MCP settings or merge this generic snippet into your own config, replacing paths with absolute paths:

```toml
[mcp_servers.jev]
command = "/absolute/path/to/node"
args = ["/absolute/path/to/jev-mcp/src/cli.js"]
env_vars = ["TYPESAFE_API_KEY", "TYPESAFE_MODEL"]
```

Restart or refresh the host, check that all three tools appear, and call `jev_yes_no` with the harmless input below. A missing-key error is expected until the host receives the key. This project does not edit your MCP configuration or install a background service. See the [official MCP configuration guide](https://developers.openai.com/codex/mcp).

## ChatGPT

ChatGPT registration is separate from Codex support. This repository alone does not grant account access. See [ChatGPT setup and compatibility](docs/chatgpt.md) for the currently documented private tunnel and authenticated deployment options. Tunnel setup, credentials and grants require owner action.

## Optional local Streamable HTTP

For a local client that supports bearer authentication, privately set `JEV_MCP_TOKEN` to a random URL-safe string of at least 32 characters, then run:

```sh
node src/cli.js --http
```

The endpoint is `http://127.0.0.1:8787/mcp`. `JEV_MCP_PORT` may select another port from 1024–65535. The listener is loopback only and always requires `Authorization: Bearer <JEV_MCP_TOKEN>`. It rejects browser Origin headers and non-loopback Host values. It supports stateless Streamable HTTP POST/JSON; it has no legacy SSE endpoint. Stop with Ctrl-C.

Codex HTTP configuration can use `url = "http://127.0.0.1:8787/mcp"` and `bearer_token_env_var = "JEV_MCP_TOKEN"` in place of the stdio settings. This token is separate from the upstream TypeSafe key. It is not a ChatGPT OAuth implementation. Do not forward this local listener to the public internet.

## Safe examples

Use synthetic text without personal data or credentials:

```json
{
  "state": "The package arrived this morning.",
  "instructions": "Has the package arrived?"
}
```

Send that input to `jev_yes_no`. A successful tool result contains `model`, `answer` and `usage`. For choice and score arguments, see [examples/decisions.json](examples/decisions.json). The examples are inputs, not claims about live results. Each tool call makes one upstream request and may incur TypeSafe charges. It performs no automatic retries.

## Limits and safety

State is capped at 16,000 characters; instructions and each criterion at 4,000. Labels are 1–64 ASCII letters/digits/underscores/hyphens and start with a letter. There are at most four active upstream calls per process. Requests time out after 20 seconds. Responses are capped at 256 KiB and validated for type, bounds and matching criteria. Small rounding tolerances apply to distributions and weighted scores. Unknown upstream fields are removed.

HTTP additionally caps the entire JSON request body at 128 KiB, which may impose a lower effective limit for large criteria or multibyte text.

All upstream calls use the fixed HTTPS System One endpoint; redirects are refused. This adapter logs neither request bodies nor secrets, and returns fixed error codes/messages instead of upstream error text. Supplied text goes to TypeSafe; the MCP host and provider have their own retention policies. Local bearer protection is not a public-service security design. See [SECURITY.md](SECURITY.md).

## Official TypeSafe skill

The [official skill](https://docs.typesafe.ai/agent-skill) is separate from this adapter. Review [its source](https://github.com/typesafe-ai/skills/tree/main/skills/typesafe-ai) before installing it with your agent's supported skill installer. For Codex's Skill Installer, use `--repo typesafe-ai/skills --path skills/typesafe-ai`. Installation does not create a key or enable MCP access. Existing skills should be preserved.
