# Forge Production Workflow

Forge uses a fixed pipeline with named owners, required tools, outputs and acceptance gates.
The machine-readable source is `workflow/game-production.json`; the UI reads `GET /api/workflow`.

## Research basis

- Unity Learn's production cycle: **pre-production → production → post-production → operations**, with
  explicit art/design and programming roles.
  <https://learn.unity.com/course/unit-9-iterate-on-your-game/tutorial/explore-the-production-cycle?version=2022.3>
- Unity's asset model: assets are imported into the project, tracked by the Asset Database, and need
  version control and a deliberate import/build path.
  <https://docs.unity3d.com/Manual/AssetWorkflow.html>
- Anchorpoint's asset-management guidance: metadata, provenance/licensing, version history, reviews,
  file locking, and engine/DCC integration.
  <https://www.anchorpoint.app/blog/a-proper-guide-to-game-asset-management>
- SEELE's 3D asset pipeline: acceptance brief → blockout → geometry → UV/material → rig/animation →
  optimize with evidence → validated engine handoff, with source/working/delivery separation.
  <https://www.seeles.ai/resources/blogs/3d-asset-pipeline-guide>

These are workflow references, not claims that any one studio works exactly this way. Forge uses the
common constraints: one owner per transition, named checks, provenance, and a human release gate.

## Stages

| Stage | Phase | Gate |
|---|---|---|
| Direction & Intake | Pre-production | scope, non-goals, target hardware and risk explicit |
| Concept & Prototype | Pre-production | playable loop, kill criteria and a recorded test |
| Design & Technical Plan | Pre-production | every mechanic has owner, acceptance and budget |
| Art Bible & Preproduction | Pre-production | one representative asset passes source→engine with licence/evidence |
| Vertical Slice | Production | slice runs start-to-finish at target quality and budget |
| Production | Production | every task has scope, evidence and Master acceptance |
| Integration & Assembly | Production | clean-project import and end-to-end route pass |
| QA & Polish | Post-production | no blockers/crashes; evidence for every fix |
| Release Candidate | Post-production | human signoff; reproducible build and licence bundle |
| Post-release / Live Ops | Operations | patch has rollback and human owner |

## Roles

The roster contains 23 roles: producer, game director, game designer, systems designer, level
designer, narrative designer, UX designer, art director, concept artist, 2D artist, 3D modeler,
technical artist, animator/rigger, VFX artist, audio designer, gameplay engineer, UI programmer,
tools/pipeline engineer, QA lead, performance engineer, asset scout/librarian, localization/
accessibility, and release engineer.

Each role in JSON has:

- `mission`
- `skill`
- `worker_class` (`reasoning`, `tool`, `tool-assisted`, `asset`)
- `tools`
- `outputs`
- `acceptance`
- `never`
- `handoff_to`

The **role is not a new model**. A role is assigned to the best available worker for its skill:
NVIDIA/Local/OpenCode for reasoning, Blender for Blender jobs, PD Howler/Rytmik/RPG Maker/
TyranoBuilder when their adapters are wired, and the Asset Pointer skill for sourcing.

## Tool map

- **Blender** — 3D model, rig, animation, GLB/FBX handoff.
- **PD Howler** — paint, textures, 2D FX; installed, adapter pending.
- **Rytmik Studio/Ultimate** — music and SFX; installed, adapter pending.
- **RPG Maker MV/VX Ace** — maps/events/RPG content; installed, adapter pending.
- **TyranoBuilder** — visual-novel flow; installed, adapter pending.
- **Image/2D** — Forge image worker + Qwen-Image 2.1/PD Howler.
- **Engine** — Web/Unity workers with browser/engine validation.

## Asset Pointer

`skills/forge-asset-pointer/` is the Asset Bot contract:

- source catalogue in `sources.json`
- licence-first policy
- project folder contract
- pointer schema and hash
- handoff notes to the receiving skill

The Asset Bot does not download or integrate blindly. It records the exact source, licence,
attribution, hash, path, owner and task; the Art Director accepts style, the Technical Artist accepts
the engine handoff, and the human approves paid/custom/NC assets.

## Agent notes/events

Every skill gets:

```text
skills/<skill>/
  notes/YYYY-MM-DD/NOTE-*.md
  assets/inbox/
  assets/outbox/
  handoffs/
```

The authoritative note log is `data/skill-notes/<skill>/index.json`. A note contains timestamp,
sender, recipient, kind (`task|handoff|asset|question|blocker|done|note`), job, message, paths and
read state. Consumers can list notes, post a note, and mark it read through the API.
