# Forge Tool Adapters

A green tool is a tested automation surface, not merely an installed application.

## Green / tested

### Blender 5.2.3

- Adapter: headless `blender -b --factory-startup --python`.
- Test: cube + GLB export, **0.8s**, **3,460 bytes**.
- Limits: smoke/export jobs only until a scripted asset contract exists.

### PD Howler 11

- Adapter: `ImageMagick 6.2.2 convert.exe` shipped in the PD Howler directory.
- Test: generated 256×256 gradient → 64×64 PNG, **1,768 bytes**.
- Limit: **conversion/resize/color only**. PD Howler painting is GUI-only; the adapter does not claim
  to paint or generate production art.
- Handoff: output is registered as an Asset Pointer and noted to the receiving image worker.

### RPG Maker MV

- Adapter: read-only project validator over `data/System.json`, `data/Actors.json`, `Map*.json`.
- Test: 15 data files, 2 maps, 5 actors, 46 system keys; zero files changed.
- **Author adapter:** sandbox-only event creation with mandatory backup and rollback.
  - Job `JOB-092C4EA1`: event 1 `FORGE_AUTHOR_TEST`, Show Text command.
  - Backup `data/_forge_backups/Map001.20261022-091134.json`.
  - Original hash `df3f2500…d0db7`; new hash `afb6e039…7d972`.
  - Rollback restored the original hash exactly.
  - Limit: structural JSON validation only; runtime verification in RPG Maker MV is still pending.

## Blocked / orange

| Tool | Why blocked |
|---|---|
| **TyranoBuilder** | Electron GUI; no supported headless project interface found. |
| **RPG Maker VX Ace** | GUI editor; no project-format adapter wired. |
| **Rytmik Studio** | Unity GUI; no supported headless CLI. |
| **Rytmik Ultimate** | Unity GUI; no supported headless CLI. |

A blocked tool stays visible in the Dispatcher with **no adapter** and `testable=false`. It is not
assigned work and its limitations are recorded in `tooling.py`.

## API

```text
GET  /api/tools
POST /api/tools/pdhowler/test
POST /api/tools/rpgmaker-mv/test
```

Each test creates a normal Dispatcher job. A blocked tool returns HTTP 409 with its reason.

## OpenCode status

OpenCode free was healthy during the earlier 9-model gauntlet, then hit the provider quota:
`Free usage limit reached`. All OpenCode agents are now **red/offline** and excluded from dispatch.
This is an external quota state, not a model-quality result. Use `POST /api/opencode/reset` only after
quota/Go is restored.

### Unity Test Runner

- Agent `unity-test`, kind `unity`, adapter `unity test --mode EditMode`.
- Real job `JOB-51EAA237`: 22 tests, 0 failures, 0 errors.
- Read-only; it does not edit scenes or code.
- Requires the Unity CLI at `<USER>\AppData\Local\Unity\bin\unity.exe`.

### Unity Test Runner (PlayMode)

- The worker currently runs EditMode. PlayMode is proven locally: `tests=1 failures=0`.
- PlayMode test: `ArenaRuntimeShowsOnboardingHint`, 1.890s.
- The worker adapter still needs a PlayMode switch before it can report PlayMode jobs end-to-end.

### Unity Test Runner (PlayMode update)

- Adapter now selects PlayMode when the job title/brief contains `playmode`.
- Verified job `JOB-13C6E200`: `Mode: PlayMode`, 1 test, 0 failures, 0 errors.
- EditMode remains `JOB-51EAA237`: 22/22.
- Runtime object existence is proven; visual legibility and full play remain unverified.
