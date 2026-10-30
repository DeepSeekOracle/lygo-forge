# UniForge3D Studio — Forge note

**Source:** https://x.com/camenduru/status/2111103536499192263  
**Studio:** camenduru/uniforge3d-studio (Docker)  
**Upstream:** https://github.com/xibushu/UniForge3D  
**Code licence:** MIT  
**Decision:** **NOT ADOPTED. No Docker install.**

## What it does

Generates a complete 3D asset from sparse, unposed multi-view images using a shared
anchor-guided reconstruction/generation model.

## Why not adopted

- **VGGT-derived checkpoints are CC BY-NC 4.0** — non-commercial.
- The default **BRIA RMBG-2.0** background remover needs separate commercial authorization.
- Docker/CUDA model stack is large; 8 GB feasibility is unverified.
- Forge’s commercial game output needs clean licences; this fails that requirement.

## If a non-commercial research project is intended

- Run it in Docker, isolated from Forge.
- Use its own output folder.
- Do not ship the meshes in a commercial build.
- Replace/avoid the BRIA remover if commercial rights are needed.

## Forge path today

- **Blender** headless worker for authored/imported meshes.
- **glTFpack** for GLB optimization.
- **ThreeJS Assets** free commercial tier for licensed web props.
- **Mixamo/Blender** for humanoid rigs.
- No local multi-view 3D generator with commercial weights is installed.

## Pointers

- https://github.com/xibushu/UniForge3D
- https://github.com/camenduru
- https://github.com/zeux/meshoptimizer
