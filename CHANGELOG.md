# Changelog — LYGO Forge

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.9.1] — 2026-10-30 — **Public Beta 1**

### Added
- **First public source tree** for the Forge: server, dispatcher, board, asset registry, skills
  browser and preview host, with the `template/`, `pipeline/`, `harness/` and `docs/` trees.
- **`INSTALL.md`** covering both routes — the one-folder EXE and a source build — plus the
  asset-exclusion rule for packaging.
- **`DISCLAIMER.md`, `SECURITY.md`, `CHANGELOG.md`.**
- **`licenses/`** carried forward: BMAD-MIT, GENEX-MIT, SPEC-KIT-MIT and the third-party notice file.

### Changed
- **Version stamped 1.9.1** in `VERSION`.
- **Quiet process spawning** — `win_quiet.py` patches `Popen` with `CREATE_NO_WINDOW` and the
  console API passes `creationflags`, ending a popup-window storm caused by spawning a coding CLI
  once per console turn. Do not reintroduce a bare `subprocess.run`.
- **Command-line overflow fixed** — briefs longer than ~1,400 characters are written to
  `.forge-briefs/` instead of being passed on the command line.
- **Dispatcher closed loop** — stall detection, retry, dispatch, apply-with-evidence and MASTER
  escalation; the free-API path has a 25 s timeout with fallback.
- **Repo hygiene** — 30+ timestamped `*.bak-*` copies of `server.py` and `orchestrator.py` are not
  published, and third-party payloads are excluded (see below).

### Reference measurements
On the steward's tree the suite ran **1397 passed, 97 skipped, 0 failed**, and `forge_selftest.py`
reported green. Those are reference points; the skips are Windows symlink and missing-payload cases,
and your clone will differ unless you install the optional payloads.

### Known at release
- **GPU contention** with the console engine, ComfyUI and media limbs on a single 8 GB card.
- **Assets are yours to supply**; a fresh clone has empty `jobs/`, `projects/` and asset folders.
- **No engine on 11441 → `local_ready: false`** and the board parks work. That is correct.
- Public betas move: board schema and API routes may change.

### Not included in this repository
`.venv-bark/`, `.venv-kokoro/`, `dist/`, `build/`, `data/`, `jobs/`, and the heavy tool payloads
(`audio-studio-mcp`, `TripoSR`, `Godot`, `Pixelorama`, `threeui`, `bark-model`, `gltfpack`).

## Licence

LYGO Fair Usage v1.9.1 — see [`LICENSE.md`](LICENSE.md). Third-party components keep their own
licences; see [`licenses/`](licenses/).
