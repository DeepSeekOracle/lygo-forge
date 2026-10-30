# ChatGPT setup and compatibility

Documentation checked on 2026-10-21. Account access and UI labels can change. No account-specific access has been verified.

## Transport and authentication

[OpenAI's custom MCP guide](https://developers.openai.com/api/docs/guides/custom-mcp-server) documents ChatGPT web registration through Plugins → Add custom MCP server. It supports SSE and streaming HTTP, with OAuth, no authentication, or mixed OAuth/no-auth modes. Workspace and security restrictions apply. The guide does not establish this user's eligibility; confirm that the custom-server option is available in the intended account before setup. Do not assume Codex access grants ChatGPT custom-server access.

This adapter offers stdio and local bearer-authenticated Streamable HTTP. Codex supports these locally. ChatGPT's documented authentication choices do not imply support for entering an arbitrary static bearer token. The TypeSafe API key authenticates the server to TypeSafe, not ChatGPT to the connector.

## Preferred private route: Secure MCP Tunnel, if available

[OpenAI documents Secure MCP Tunnel](https://developers.openai.com/api/docs/guides/secure-mcp-tunnels) for forwarding to private stdio or HTTP MCP servers without inbound public exposure. It requires a tunnel associated with the intended workspace, a runtime API key, and appropriate permissions. These are separate from the TypeSafe key.

Owner setup:

1. Verify account/workspace eligibility and Platform tunnel access.
2. Follow the official guide and current `tunnel-client help quickstart`; choose a local stdio profile launching `node /absolute/path/to/jev-mcp/src/cli.js`.
3. Supply `TYPESAFE_API_KEY` privately to the launched server. Confirm child environment forwarding with the current client; do not embed a key in the command or profile.
4. Run the client's doctor and foreground runner, then select the intended tunnel while adding the custom MCP server in ChatGPT.
5. Configure the required authentication, review the grant and install the plugin. Test discovery and one synthetic decision end to end.

Tunnel credentials, OAuth grants, persistent startup and network configuration have not been created by this project. Availability and any account costs must be checked before proceeding.

## Alternative public deployment: future owner-approved work

The [OpenAI connection guide](https://developers.openai.com/plugins/deploy/connect-chatgpt) documents public HTTPS with Streamable HTTP or a private tunnel. This repository does not deploy a service or implement OAuth. A public deployment would need a separately reviewed OAuth-capable gateway/service, MCP authorization discovery and token validation, TLS, abuse/cost controls, and an authorized owner setup. Do not expose this loopback bearer listener directly or select unauthenticated public access to a server holding your TypeSafe key.

## Acceptance checks after owner setup

- All three decision tools appear with input/output schemas and annotations.
- A synthetic yes/no tool call returns a bounded probability; choice and score return matching distributions.
- A missing server key produces `NOT_CONFIGURED`; an upstream credential rejection produces `AUTHENTICATION`. Neither error exposes a key or provider body.
- Stop the tunnel/server and confirm calls fail; revoke access through the host if it is no longer needed.

Until those checks pass in the actual account, describe the connector as built and offline-tested, not connected or live-verified.
