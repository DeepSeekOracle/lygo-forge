# Hi3D v1.0 — Forge pointer

**Verdict:** keep as a free external capability. Do not install locally on this Windows host.

| Item | Value |
|---|---|
| Model | Hi3D v1.0 (Sparc3D successor) |
| Type | Image + coarse mesh → high-resolution geometry refinement |
| Code | https://github.com/hi3d-official/Hi3Dv1.0 |
| Weights | https://huggingface.co/hi3d-official/Hi3Dv1.0 |
| Free demo | https://huggingface.co/spaces/ilcve21/Sparc3D |
| Project | https://www.hi3d.ai/ |
| License | Hi3D Open License Agreement v1.0 |
| Local install | **No** |
| Forge skill | `forge-3d-refine-worker` |

## Why pointer-only

Hi3D requires Linux, Python 3.10, an NVIDIA GPU with compute capability 8.0+, CUDA 12.0–12.5,
and has **no CPU path**. Its measured configuration used a 96 GB H20. The 1536³ ladder was only
validated there; 8 GB feasibility is not established. The Forge host is Windows with an 8 GB
RTX 4060 Ti.

## What Forge may claim

- It can prepare the reference image and coarse mesh.
- It can send the pair to the free HF Space or an approved external Linux GPU.
- It can record the refined GLB and provenance.
- It must not claim local inference or textured output.

## Output contract

- Geometry only (no textures/materials/vertex colors)
- 512 / 1024 / 1536 nominal sparse extraction levels
- Recentered and normalized to unit maximum radius
- Coarse-mesh structure matters; hidden areas are plausible completions

## Licence notes

Commercial use is permitted under the Hi3D Open License Agreement v1.0. The Agreement's branding
and scale thresholds apply to integrations; standalone outputs that contain no Hi3D Materials or
Model Derivative have separate treatment. Preserve the exact licence and attribution with the
Asset Pointer. The optional Hunyuan3D-2 mini coarse stage is third-party and separately licensed.

## Pointers

- Skill: `skills/forge-3d-refine-worker/SKILL.md`
- Asset Pointer: `skills/forge-asset-pointer/SKILL.md`
- Workflow tool entry: `workflow/game-production.json` → Technical Artist
- License scope: https://github.com/hi3d-official/Hi3Dv1.0/blob/main/THIRD_PARTY_LICENSES.md
