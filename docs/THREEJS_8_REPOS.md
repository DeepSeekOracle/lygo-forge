# Three.js / AI 3D repo list — Forge selection

**Source:** https://x.com/zmdsb259414/status/2113140946699460933

| Repo | Decision | Reason |
|---|---|---|
| **img2threejs** | **Installed** | Apache-2.0; local code-only image→Three.js pipeline; gates verified. |
| Motion2MixamoRig | **Pointer, non-commercial** | Python/Blender; SMPL-X weights are non-commercial; commercial use needs a separate deal. |
| dsh-blender-plugin | **Pointer** | DSH-specific Blender control; overlaps existing Blender-MCP/headless worker. |
| dioramas | **Pointer** | MIT engine/examples; asset pipeline uses paid fal.ai (Nano Banana/Meshy). |
| video-shotcraft | **Pointer** | Remotion code-video skill; not installed; Remotion licence must be verified. |
| lemo-opuscar | **Already pointer** | Existing motion prompt library. |
| jianying-headless | **Disregard** | CapCut/Jianying draft automation; ToS and app-version fragility. |
| mg-styles-15 | **Pointer** | Motion-graphics styles; use as reference, re-author. |

## Installed

```text
<FORGE_DIR>\tools\img2threejs
Apache-2.0, repo 0.1.1 / skill 2.0.0
Node >=18, Python >=3.10, Git
```

No host installer was run. Forge skill: `forge-img2threejs`.

## Key constraints

- img2threejs rebuilds **code-only procedural models**; it is not photogrammetry.
- Motion2MixamoRig's SMPL-X model licence is **non-commercial**; do not use its outputs in a commercial game without a licence.
- dioramas is code-MIT but its hero assets are generated through **paid fal.ai**; the engine/examples can be studied without buying.
- Do not copy branded/patented objects you lack rights to.

## Pointers

- https://github.com/img2threejs/img2threejs
- https://github.com/MaxLiu22/Motion2MixamoRig
- https://github.com/sixtysevenlf/dsh-blender-plugin
- https://github.com/blendi-remade/dioramas
- https://github.com/Vincentwei1021/video-shotcraft
- https://github.com/mcncarl/jianying-headless
- https://github.com/Vincentwei1021/mg-styles-15

---

**Seen again 2026-10-27:** https://x.com/romandevz/status/2114655026190618718 lists the same seven repos (img2threejs, Motion2MixamoRig, dsh-blender-plugin, dioramas, video-shotcraft, lemo-opuscar, mg-styles-15). No new decision — this table stands, and the licence notes above are the authority.
