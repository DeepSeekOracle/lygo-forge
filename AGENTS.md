# LYGO Forge — agent contract

Forge is a local task surface. No auth. Bind is 127.0.0.1 only.

## Read order

1. `GAME.md` — brief, pillars, non-goals.
2. `PLAN.md` — phase, milestones.
3. `TASKS.json` — the only allowed queue.
4. `GDD.md` — design truth.
5. `ART_BIBLE.md`, `ASSET_PLAN.md` — look and licences.
6. `TECH_SPEC.md` — architecture and budget.
7. `QA.md`, `DECISIONS.md` — evidence and decisions.

## API

- `GET /api/harness` — profiles, phases, specialists, research.
- `GET /api/projects` — projects and profiles.
- `POST /api/projects` — `{name, profile}`; bootstraps the harness.
- `POST /api/adopt` — `{path, profile?}`; adopt an existing HTML5/Unity folder.
- `POST /api/projects/<slug>/harness` — initialize missing artifacts.
- `GET /api/projects/<slug>/tasks` — task graph and next task.
- `POST /api/projects/<slug>/tasks/<id>` — `{status, evidence}`; dependencies enforced.
- `POST /api/build` — `{project, model, task, specialist, prompt?}`.

## Rules

- Work only on the selected task.
- Do not add features, assets, libraries or engine changes outside it.
- Update the owning artifact and append evidence to `TASKS.json`.
- A build is blocked when a previous phase has incomplete tasks.
- A task cannot be marked done while a dependency is pending.
- Prefer OpenCode free, NVIDIA free, then local Qwen.
- No accounts, credits, store, telemetry, or unlicensed assets.

## Dispatcher contract

- Forge Master: create one job, assign one worker, review one return.
- Worker: execute only the assigned `forge-*` skill; no scope expansion.
- Job states: queued → working → returned → accepted/done, or rework/failed.
- Remote shared-bus jobs are `dispatched` until a real result returns.
- ChatRTX is UI-only and not dispatchable on this install.
- Human acceptance is required before a version is considered done.
