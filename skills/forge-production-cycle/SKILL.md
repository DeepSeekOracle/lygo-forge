# Forge Production Cycle

Use this skill to run a small game through a complete Forge cycle. It is a **sequence of
gated stages**, not one model prompt.

## Stage 0 — scope lock

- Genre and core loop chosen.
- 30–90 minute target for the first build.
- One engine: Unity **or** Web/Three.js.
- Art direction and style anchor saved.
- Asset budget and animation budget written down.
- Acceptance criteria for the vertical slice.

## Stage 1 — assets

- 2D: Forge image worker / Asset Foundry.
- 3D: `forge-image-to-3d` (TripoSR) → `pipeline/blender_prep.py`.
- Every accepted asset goes through `pipeline/asset_vault.py ingest`.
- Rejected assets stay rejected; do not silently regenerate the same failure.

## Stage 2 — rig and animate

- Clean/retopo the base mesh.
- Rigify or Mixamo rig; validate weights.
- Animation clips; validate in engine.
- A base mesh from TripoSR is **not** animation-ready by itself.

## Stage 3 — implement

- Unity profile or Web/Three.js profile.
- One vertical slice: menu → play → win/lose → restart.
- Save/load, settings, input, pause.
- No hidden online services.

## Stage 4 — build

- Web: static build in `build/web`.
- Unity: `unity-build` worker with `target=StandaloneWindows64` or `WebGL`.
- Build output must be a directory a stranger can run.

## Stage 5 — test

- Web: `forge-playtest` screenshot/FPS/error capture.
- Unity: PlayMode tests + recorder captures.
- Human playtest: 5 people, first 10 minutes.
- Fix fun/readability problems before adding content.

## Stage 6 — release

- `forge-release` builds the ZIP + SHA-256 manifest + credits/licences.
- Code signing is a separate operator step.
- Store metadata, capsule art and privacy/age declarations are separate.

## GPU arbitration

`pipeline/gpu_lease.py` prevents two heavy jobs from starting together.

```powershell
python <FORGE_DIR>\pipeline\gpu_lease.py acquire --owner forge --purpose blender --minutes 30
python <FORGE_DIR>\pipeline\gpu_lease.py release --owner forge
```

TripoSR runs CPU-first so the shared Gemma engine stays resident.

## Evidence

Every stage returns:

- command run
- output path
- hash or report
- pass/fail
- what is **not** verified

Do not call the cycle complete on a screenshot alone.
