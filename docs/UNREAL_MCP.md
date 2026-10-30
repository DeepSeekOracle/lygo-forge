# Unreal Engine MCP skills — Forge pointer

**Source:** https://x.com/mylifcc/status/2112408469903114580  
**Repo:** https://github.com/EpicGames/unreal-engine-skills-for-claude-code-plugin  
**Licence:** MIT  
**Decision:** **POINTER ONLY. No install.**

## What it is

Epic’s official Claude Code plugin for driving a live Unreal Editor over MCP:

- 30+ toolsets, hundreds of editor tools
- actors, blueprints, materials, Niagara, Control Rigs, Sequencer, State Trees, UMG, GAS
- C++ automation test discovery/execution
- `ProgrammaticToolset.execute_tool_script` for batch Python
- tool-search meta-tools: `list_toolsets`, `describe_toolset`, `call_tool`
- optional proxy that survives editor restarts

## Requirements

1. Unreal Editor with **ModelContextProtocol** and **AllToolsets** enabled
2. Editor running; MCP server started (`ModelContextProtocol.StartServer`, default `localhost:8000/mcp`)
3. Claude Code, or another MCP client
4. Bash for the SessionStart hook on Windows (Git Bash/WSL)

## Why Forge does not install it

- Forge profiles are **Unity + Web**, not Unreal.
- It requires a full Unreal Editor and project; this host has no Unreal profile/toolchain.
- The MCP server is localhost but **not a trust boundary**; any same-user process can connect.
- `execute_tool_script` is **arbitrary Python inside the editor** with project/asset access.
- Forge’s dispatcher is not an MCP client; adding Unreal would be a new engine line, not a plugin install.

## Useful engine-agnostic pattern

The **3 meta-tools** approach is worth copying:

```text
list_toolsets
describe_toolset
call_tool
```

Only ~250 tokens of tool surface are loaded; the agent discovers and calls a toolset on demand.
That keeps prompt caches warm and avoids dumping hundreds of tool definitions. Forge’s dispatcher
can use the same idea for large external tool catalogs.

## If Unreal is added later

1. Create a separate Forge Unreal profile; do not mix it with Unity.
2. Install the plugin in a **throwaway project** first.
3. Save/commit before any long MCP session.
4. Never run with `--dangerously-skip-permissions`.
5. Bind MCP to loopback only; never expose port 8000.
6. Record plugin version, editor version and generated client config.
7. Test “list actors” and one non-destructive edit before any build work.

## Pointers

- https://github.com/EpicGames/unreal-engine-skills-for-claude-code-plugin
- `docs/ENGINE_OPTIONS.md`
