# LYGO Forge — v1.9.1 Public Beta

Local production workspace: a board, a dispatcher, a skills browser, an asset registry and a
preview server for building games, sites and media projects with an agent.

**This tag is the first Public Beta of the working system.**

- **Prebuilt EXE:** LYGO Skill Hub → Forge 1.9.1 (one-folder build, no install required)
- **From source:** [`INSTALL.md`](INSTALL.md)
- **License:** LYGO Fair Usage v1.9.1 — see [`LICENSE.md`](LICENSE.md) and [`licenses/`](licenses/)

---

## What it does

```
board ──▶ dispatcher ──▶ agent turn ──▶ applied files ──▶ evidence
```

- **`server.py`** — the Forge HTTP service (port **8796**) and the UI host.
- **`orchestrator.py`** — the dispatcher: stall detection, retry, dispatch, apply-with-evidence.
- **`harness_data.py`, `context_builder.py`** — task state and the context handed to a turn.
- **`llm_setup.py`, `hermes_brain.py`, `hermes_turn.py`** — model wiring (local engine or a free API
  path), with a timeout and a fallback.
- **`assets.py`** — asset folder registry.
- **`skills/`** — the skill library the dispatcher can route work to.
- **`template/`** — project scaffolds.
- **`docs/`** — the Forge's own documentation.
- **`web/`** — UI assets.

The Forge is intentionally **standalone**: it does not merge its engine into the Manager, and it can
share the stack's local engine through the bridge on **8081** / engine **11441** without owning them.

## Requirements

- Windows 10/11 x64.
- Python **3.13**.
- A model: a local engine reachable on 11441 (shared with the console) or a configured free API path.
- Disk: the working tree is small; **your project assets are not** — they live where you put them.
- Optional: PyInstaller 6.22.3 to build the EXE.

## Quick start

```powershell
git clone <this repo> lygo-forge
cd lygo-forge
.\install.ps1              # checks Python, writes first-run config
.\LYGO Forge.bat           # or: python server.py
# open http://127.0.0.1:8796
```

Full detail, including the EXE build: [`INSTALL.md`](INSTALL.md).

## What is deliberately not in this repository

The Forge's value is in **your** assets and jobs, not in ours. Excluded by design:

| Excluded | Size | Why |
|---|---|---|
| `.venv-bark/`, `.venv-kokoro/` | 3.7 GB | local TTS/ASR environments |
| `dist/`, `build/` | 1.2 GB | previous PyInstaller output |
| `data/`, `jobs/` | — | runtime state and job artefacts |
| `tools/audio-studio-mcp/` | 5.2 GB | third-party tool payload |
| `tools/TripoSR/` | 5.5 GB | third-party model weights |
| `tools/Godot/`, `tools/Pixelorama/` | 282 MB | third-party application binaries |
| `tools/threeui/` | 124 MB | vendored UI kit with `node_modules` |
| `tools/bark-model/`, `tools/gltfpack/` | 159 MB | weights and a binary |
| `*.bak-*` (30+ files) | — | timestamped backups of `server.py`/`orchestrator.py` |

Included tool sources (small, inspectable): `tools/img2threejs`, `motion-skills`, `jev-mcp`,
`diagram-design`, `piskel`, `bark-hf`. Their own licences are in `licenses/` and inside each folder.

**No assets are shipped.** Every image, model and project file is the user's own, under the user's
own licence. If you build with the Forge, you are responsible for the rights to what you feed it.

## Verify

```powershell
# service answers
Invoke-RestMethod http://127.0.0.1:8796/api/status

# internal self-test
C:\Python313\python.exe forge_selftest.py

# unit tests
C:\Python313\python.exe -m pytest -q
```

Historical baseline from the steward's tree: the Forge suite ran **1397 passed, 97 skipped, 0
failed** (2026-10-26). Treat that as a reference point, not a guarantee on your machine — the
skips are Windows symlink and missing-payload cases.

## Known limits

- **GPU contention is real.** The Forge shares one 8 GB card with the console's engine, ComfyUI and
  media limbs. One heavy job at a time; asset generation blocks while the engine holds VRAM.
- **Assets are yours to supply.** A fresh clone has empty `jobs/`, `projects/` and asset folders.
- **The dispatcher needs a model.** Without 11441 or a configured API path it will report
  `local_ready: false` and park work — that is correct behaviour, not a crash.
- **Long jobs are jobs.** Do not run a board unattended and expect it to finish silently.
- **Beta interfaces move.** Board schema and API routes may change between betas.

## Documentation

| File | |
|---|---|
| [`INSTALL.md`](INSTALL.md) | install, run, build the EXE, troubleshoot |
| [`AGENTS.md`](AGENTS.md) | the rules agents follow inside the Forge |
| [`docs/`](docs/) | design and run notes |
| [`CHANGELOG.md`](CHANGELOG.md) | what 1.9.1 changed |
| [`DISCLAIMER.md`](DISCLAIMER.md) | what you accept by running this |
| [`SECURITY.md`](SECURITY.md) | reporting, secret rules, posture |
| [`licenses/`](licenses/) | third-party notices |

**Steward:** Justin Helmer — Lightfather · Excavationpro · DeepSeekOracle
