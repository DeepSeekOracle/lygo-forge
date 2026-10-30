# 10 game-dev repos — Forge selection

**Source:** https://x.com/heyrimsha/status/2113205748302070235

| Repo | Decision | Reason |
|---|---|---|
| Claude Code Game Studios | **Disregard** | Paid Claude Code agent team; Forge already has a free dispatcher. |
| Godot Engine | **Disregard for now** | Free engine, but Forge’s profiles are Unity/Web. Adding Godot is a new engine line, not a tool install. |
| Blender MCP | **Pointer already recorded** | Needs interactive Blender and an unauthenticated local socket; Forge Blender is headless. |
| Terrain3D | **Disregard** | Godot-only addon. |
| Godot Jolt | **Disregard** | Godot-only physics addon. |
| LimboAI | **Disregard** | Godot-only behavior trees. |
| Dialogic | **Disregard** | Godot-only dialogue addon. |
| Phantom Camera | **Disregard** | Godot-only camera addon. |
| **meshoptimizer / gltfpack** | **Installed** | MIT; optimizes GLB/GLTF for web/Unity; tested. |
| Godot demo projects | **Disregard** | Godot-only examples. |

## Installed

```text
gltfpack 1.3
<FORGE_DIR>\tools\gltfpack\gltfpack.exe
MIT
```

Test: Blender smoke GLB 3,460 → 2,356 bytes, exit 0.

## Not installed

Godot and its addons are a separate engine ecosystem. Forge remains Unity/Web; do not claim a
Godot profile exists. Blender MCP remains a pointer for the reasons in
`docs/BLENDER_MCP_STACK.md`.
