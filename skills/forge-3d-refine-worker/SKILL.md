# FORGE 3D REFINEMENT WORKER — Hi3D v1.0

**Status:** EXTERNAL FREE TOOL / POINTER  
**Local install:** NO — do not install this stack on the Windows 8 GB Forge host.

## Decision

Hi3D v1.0 is useful to Forge as a **high-resolution geometry refinement** stage for 3D assets.
It is free to download and use under the Hi3D Open License Agreement v1.0, but it is **not a
text-to-3D generator**: it needs a reference image **and a coarse mesh** of the same object.

Use it when a job needs a better game-ready 3D mesh than the coarse source provides. Do not
install its local GPU stack on this machine.

## Why it is pointer-only here

The official requirements are:

- Linux
- Python 3.10
- NVIDIA GPU with compute capability 8.0 or newer
- CUDA toolkit 12.0–12.5
- no CPU inference path
- measured stack used a **96 GB NVIDIA H20**
- the 1536³ ladder has only been validated on that GPU; 8 GB feasibility is not established

This Forge host is Windows with an 8 GB RTX 4060 Ti. Installing the weights and kernel stack
locally would be a false capability. Use the free Hugging Face Space or an external Linux GPU.

## Free access points

- **Live free demo:** https://huggingface.co/spaces/ilcve21/Sparc3D
- **Model / weights:** https://huggingface.co/hi3d-official/Hi3Dv1.0
- **Inference code:** https://github.com/hi3d-official/Hi3Dv1.0
- **Project page:** https://www.hi3d.ai/
- **License:** https://github.com/hi3d-official/Hi3Dv1.0/blob/main/LICENSE
- **Third-party/licence scope:** https://github.com/hi3d-official/Hi3Dv1.0/blob/main/THIRD_PARTY_LICENSES.md

## What it produces

- Geometry only: `.glb` / mesh output
- No textures, materials, or vertex colors
- Output is recentered and normalized to unit maximum radius, so absolute scale is not preserved
- Hidden geometry is a plausible completion, not a reconstruction
- 512 / 1024 / 1536 sparse extraction levels; 1536 runs all three passes

## Forge workflow

1. **Concept / image worker** produces or selects a clean reference image with clear subject framing.
2. **Blender worker** produces a coarse `.glb` mesh, or the job supplies a licensed coarse mesh.
3. **Hi3D refinement** runs through the free HF Space or an approved external Linux GPU. The local
   Forge host must not claim it ran locally.
4. Download the refined `.glb` and verify it opens, scale/pivot are corrected, and the detail is
   appropriate for the target engine budget.
5. **Asset Pointer** records source URL, exact licence/attribution, SHA-256 hash, owner, task,
   resolution, seed if available, and the coarse-mesh provenance.
6. Technical Artist decides whether the result is accepted for import.

## Rules

- **No local Hi3D install on this Windows host.**
- Do not call it text-to-3D; a coarse mesh is mandatory.
- Do not claim textured output. Texture/material work belongs to another worker.
- Do not use the model's demo examples of third-party characters (Goku, Charizard, etc.) as Forge
  assets. Those are unlicensed fan references, not source assets.
- The optional Hunyuan3D-2 mini coarse stage is third-party and separately licensed; it is not part
  of Hi3D and is not installed by this skill.
- Commercial use is permitted under the Hi3D Agreement; if Forge is integrated into a product that
  exceeds the Agreement thresholds (200,000 monthly active users or USD 1,000,000 monthly revenue),
  the operator must obtain a separate written licence and follow the attribution terms.
- Commercial integrations must display `Powered by Hi3D 1.0` where the Agreement requires it.
- Keep the licence text and attribution with the asset pointer.

## Acceptance

- Reference image and coarse mesh are both present and named.
- The refined mesh opens; triangle count and resolution are recorded.
- Scale/pivot are corrected for the target engine.
- Asset Pointer exists with source, licence, attribution, hash and task.
- No claim of local inference unless it actually ran on an approved local GPU.
- No unlicensed fan asset or unknown-provenance mesh enters the project.
