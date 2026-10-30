# Blender MCP motion stack — Forge pointer

**Source:** https://x.com/beamnxw/status/2113014738611290139  
**Decision:** **INSTALLED as an optional interactive Blender tool. Not used by headless Forge jobs.**

## What the stack is

1. **mcp-for-blender** — MIT; MCP server + Blender addon for AI-driven Blender control.
2. **Blender + bpy + Geometry Nodes** — Forge already has a headless Blender worker.
3. **Poly Haven** — CC0 HDRIs, PBR textures and models; already in the Asset Pointer sources.
4. **EEVEE / Cycles / FFmpeg** — preview and final render path; Forge already has FFmpeg.
5. **glTF Transform / gltfjsx / Three.js / R3F / drei** — GLB optimisation and interactive web scene.
6. **Remotion** — optional titles/audio; licence must be verified before use.

## Installed

```text
Blender 5.2.3 LTS
Addon: <USER>\AppData\Roaming\Blender Foundation\Blender\5.2\scripts\addons\blender_mcp.py
Server: uvx mcp-for-blender (not started persistently)
Status: addon enabled in a headless verification run
```

The addon is optional and interactive. Forge’s headless Blender worker remains the production path.

## Why Forge does not use mcp-for-blender for jobs

- Forge’s Blender worker already drives `blender.exe -b --factory-startup` with a Python script and exports GLB.
- MCP for Blender needs an **interactive Blender addon** and a socket server; Forge jobs are headless.
- The addon socket has **no authentication or encryption** and can execute arbitrary Python in Blender.
- It adds a new local code-execution surface for no current Forge job.
- `uv` is present, but Blender’s addon path must be selected manually if ever adopted.

## What Forge already has

```text
Blender headless worker       forge-blender-worker
CC0 Poly Haven assets         forge-asset-pointer source
GLB export                    Forge Blender smoke + selftest
Web/3D                        forge-web-worker / Three.js stack
Video encode                  FFmpeg
```

## If adopted later

- Install mcp-for-blender only on a **trusted local machine**, with Blender on localhost.
- Keep the socket on `127.0.0.1`; never expose it to LAN/internet.
- Save the `.blend` before any run.
- Use the addon’s **safe mode** if available; review scripts.
- Record version/licence and keep it outside the Forge exe.
- Test with a throwaway scene, not a production asset.

## Pointers

- https://github.com/ahujasid/mcp-for-blender
- https://polyhaven.com/
- https://github.com/donmccurdy/glTF-Transform
- https://github.com/pmndrs/gltfjsx
- https://github.com/pmndrs/react-three-fiber
- `forge-blender-worker`, `forge-asset-pointer`, `forge-web-worker`
