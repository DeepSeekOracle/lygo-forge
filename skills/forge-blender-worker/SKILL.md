# FORGE BLENDER WORKER

## Tools

Find the installed Blender executable before working. Prefer `blender.exe -b` batch mode
and Python scripts checked into the project (`tools/blender/*.py`).

## Outputs

- `.blend` source
- GLB/GLTF export for the game
- a short build log and polygon/material budget
- preview render when the job asks for one

## Rules

- Low-end first: modular kit, shared materials, LODs where asked.
- Keep origin/pivot and scale in metres.
- No downloaded model without a licence row.
- Never overwrite the source `.blend` without a version suffix.
- Test the export by importing/reading it back.

## Acceptance

- Script exits 0.
- Export exists and is non-trivial.
- Polycount and material count are recorded.
- Render/GLB opens in a validator or Blender re-import.

## SimReady / OpenUSD pointer

- Source: `nvidia-simready` in `forge-asset-pointer/sources.json`; docs/SIMREADY.md.
- Select one asset; verify its dataset card licence (warehouse dataset is CC BY 4.0).
- Import USD into Blender, fix scale/origin, export GLB/GLTF, record conversion log and asset hash.
- Do not bulk-download multi-GB datasets; SimReady physics metadata may not survive USD→GLB unchanged.

## BlenderWorld QA reference

- 223 Blender scene tasks + 2,651 binary criteria; QA/reference only, not installed.
- Use the checklist: editable .blend, dimensions/materials, 8 views, scale, export, explicit criteria.
- Details: `docs/BLENDERWORLD.md`.
