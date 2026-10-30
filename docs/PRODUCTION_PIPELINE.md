# Forge Production Pipeline

**Status:** dry-cycle capable. Asset → 3D → rig prep → build → playtest → release.

## One engine, two UIs, optional stream node

```text
LYGO console engine     Gemma 4 12B @ 11441
Manager UI              8790
Forge UI                8796
Shared bridge           8081
Stream PC               QA/build node (GTX 1060 6 GB, 16 GB RAM)
```

The stream PC is **not** a second engine. It is optional QA/build capacity.

## Pipeline tools

| Stage | Tool | Command |
|---|---|---|
| Image → 3D | TripoSR | `pipeline/triposr.py` |
| Mesh cleanup/export | Blender 5.2 | `pipeline/blender_prep.py` |
| Rig | Rigify / Mixamo | `pipeline/blender_prep.py --rigify` + manual Mixamo |
| Asset ledger | Asset vault | `pipeline/asset_vault.py` |
| GPU arbitration | GPU lease | `pipeline/gpu_lease.py` |
| Web playtest | Playwright | `pipeline/playtest_web.mjs` |
| Unity tests | Unity CLI | `pipeline/playtest_unity.ps1` |
| Unity build | Unity CLI | Forge `unity-build` worker |
| Release | ZIP + manifest | `pipeline/release.py` |
| Readiness | Probe | `pipeline/readiness.py` |

## Forge dispatcher workers

| Agent | Skill | Brief |
|---|---|---|
| `triposr-local` | `forge-image-to-3d` | JSON: image, out |
| `unity-build` | `forge-unity-worker` | JSON: project, target, output_path |
| `playtest-web` | `forge-playtest` | JSON: url, out, actions |
| `release-pack` | `forge-release` | JSON: project, build, version, out |

## Verified dry-cycle evidence

```text
TripoSR CPU               chair.png -> 947,308-byte GLB
Blender prep              23,656 verts / 47,316 tris -> GLB + FBX + blend
Rigify                    armature parented, rigify.blend saved
Asset vault               SHA-256 ingest + verify pass
Forge TripoSR job         JOB-659143CC returned TRIPOSR_OK
Forge playtest job        JOB-43A35368 returned PLAYTEST_OK, 61 fps
Forge release job         JOB-CAE7FCB1 returned RELEASE_OK, 296,934,396-byte ZIP
Stream PC hash            FDF4D288...B95D9D — independent match
Readiness probe           27/27 checks passed
```

## Resource rules

- TripoSR CPU-first; do not run GPU mode while Gemma holds VRAM.
- `gpu_lease.py` before Blender/ComfyUI/Wan heavy work.
- One heavy GPU job at a time.
- ComfyUI and the engine can coexist only when the model fits; measure.
- The stream PC is for QA/build, not 3D reconstruction.

## Honest limits

- TripoSR gives an **unrigged base mesh**, not a finished character.
- Rigify auto-weights need manual validation; Mixamo is the practical animation path.
- No local animation clip library is installed; the Quaternius Drive fetch returned empty directories and was removed. Use Mixamo or hand-keyed clips until a verified pack is downloaded.
- Unity build requires the project's build profile or a working build method.
- Release ZIP is **unsigned**; code signing remains an operator step.
- Human playtesting still decides whether the game is fun.
