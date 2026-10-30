# LYGO Forge Method — v0.2

Forge is a local, phase-gated game development harness. It is not a chat wrapper with a checklist.
It keeps four things separate and explicit:

1. **The game** — `GAME.md`, `GDD.md`, `WHITEPAPER.md`
2. **The look and assets** — `ART_BIBLE.md`, `ASSET_PLAN.md`
3. **The build** — `TECH_SPEC.md`, `PLAN.md`, `TASKS.json`
4. **The evidence** — `QA.md`, `DECISIONS.md`

## Delivery loop

**Clarify → Plan → Build → Verify → Learn**

A project moves through nine gates:

| Phase | Gate |
|---|---|
| Intake | brief, platform, target, non-goals |
| Concept | loops, pillars, slice |
| Design | GDD and balance |
| Art Bible | look, asset plan, licences |
| Technical Plan | architecture and low-end budget |
| Vertical Slice | one playable, tested slice |
| Production | content in tasks |
| QA | measurement and blockers |
| Release | build, credits, verdict |

## Three rails

### Spec rail (Spec Kit / BMAD inspired)

- Constitution: `GAME.md` pillars and non-goals.
- Spec: `GDD.md` and `WHITEPAPER.md`.
- Plan: `TECH_SPEC.md` and `PLAN.md`.
- Tasks: `TASKS.json`.
- Implement and converge: one task, one evidence record.

### Task rail

- Every task has an ID, owner, description, acceptance tests, dependencies and evidence.
- The next task is the first pending task whose dependencies are done.
- A task cannot be completed before its dependencies.
- A build cannot skip a phase gate.

### Asset rail

- `ASSET_PLAN.md` is the only asset ledger.
- Every row has source, licence, format, budget and status.
- Prefer local reuse → CC0 → generated → paid (with a decision record).
- No unknown-source asset ships.

## Profile budgets

Forge ships profiles for Web and Unity in 2D, 2.5D, HD-2D and 3D. Each profile carries a target FPS, resolution, draw call, triangle and texture budget. A budget failure is a blocker, not a polish note.

## Specialists

The 14 roles are prompts with a mission, inputs, outputs and rules. The selected task determines the role; the role cannot expand the task. The prompt also includes the project profile, phase, acceptance and low-end budget.

## What is adapted

- **BMad Method / BMad Game Dev Studio** — MIT. Delivery loop, game artifacts, specialist perspectives.
- **GitHub Spec Kit** — MIT. Constitution/spec/plan/tasks/converge and gates.
- **Taskmaster** — MIT with Commons Clause. Dependency-aware task discipline inspired Forge's task graph; no code is copied or bundled.

See `harness/skills/research.md` for links.

## Deliberate limits

- Forge does not bundle an engine, a model, or an asset generator.
- It uses the installed OpenCode CLI and the local model bridges.
- It does not publish, deploy, or buy assets.
- It does not claim a task is done from model output; evidence is required.
