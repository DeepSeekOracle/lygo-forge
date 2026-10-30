# Reason Network — Forge pointer

**Source:** https://x.com/RoundtableSpace/status/2113038872573579466  
**Repo:** https://github.com/reason-machines/reason-network  
**Licence:** MIT OR Apache-2.0

## Decision

**POINTER ONLY. No daemon installed.**

Reason Network lets coding-agent sessions on different computers exchange messages, small text files
and approval requests through MCP tools. It is technically relevant to multi-agent work, but it is not
a Forge dependency today.

## What it does

- one daemon per computer
- lists teammates' agent sessions (person, repo, branch, busy/idle)
- `list_team`, `send_message`, `ask_user`, `check_inbox` MCP tools
- stores small text files under `~/.reason/network/inbox`
- E2E encrypted peer-to-peer via iroh; encrypted relay fallback
- supports Claude Code, Codex, Cursor, Gemini CLI, Copilot CLI, Grok CLI, opencode, pi,
  DeepSeek Harness and Reason
- free sign-in with Google/GitHub/Apple/email; self-hosted relay possible

## Why Forge does not install it now

- Forge already has a dispatcher, agent registry and `<DRIVE_D>\LYGO_SHARED` task bus.
- It adds a **signed-in external account**, background daemon and internet relay/address lookup.
- It exposes teammate names, repos, branches and agent activity to the network.
- Approval pop-ups and file exchange create a new security surface.
- No Forge job currently requires cross-team agent messaging.
- The installer is a remote shell/PowerShell bootstrap; installing it should be a deliberate,
  isolated decision, not a drive-by.

## If adopted later

1. Read `DESIGN.md` and the security model first.
2. Use a dedicated account/computer and a **self-hosted relay** if possible.
3. Never send secrets or private project files.
4. Test with a throwaway repo and non-sensitive sessions.
5. Keep it out of the Forge exe; it is an external service.
6. Record relay/account ownership and network ports.

## Pointers

- https://github.com/reason-machines/reason-network
- https://reasonmachines.com/network
- Existing Forge path: dispatcher + agent registry + shared task bus
