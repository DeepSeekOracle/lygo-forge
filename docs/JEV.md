# Jev helper — installed, paid gate remains

**Repo:** https://github.com/asimons81/jev-mcp  
**Path:** `<FORGE_DIR>\tools\jev-mcp`  
**Licence:** MIT  
**Decision:** **Helper installed; live Jev disabled until a TypeSafe key is provided.**

## Installed

```text
Node dependencies installed: 95 packages
Tests: 20/20 passed
Key: none
No upstream calls made
```

The helper exposes three bounded MCP tools (`jev_yes_no`, `jev_choose`, `jev_score`) and
fails closed when `TYPESAFE_API_KEY` is absent.

## Why it is not wired into Forge dispatch

- Live Jev calls require a **paid TypeSafe API key**; no key is configured.
- Forge’s dispatcher already has deterministic routing and the escalation-only advisor policy.
- Installing the helper does not accept paid terms or create an account.
- No key was pasted into a file, command, or chat.

## If enabled later

- Set `TYPESAFE_API_KEY` in a private environment for the MCP host only.
- Keep Jev as a **bounded decision** helper, never an executor.
- Use `jev_choose` for a known menu and `jev_yes_no` for one binary gate.
- Never send secrets or private project files.
- Record the model, key owner, and usage cost.

## Pointers

- `docs/ADVISOR_PATTERN.md`
- `forge-worker`, `forge-qa-worker`
