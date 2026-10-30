# SPEC REVIEW — the Goldfish pass

Adapted from Google's open-source **Elephant / Goldfish** method
(https://github.com/google/elephant-goldfish-model, verified 2026-10-27;
post: https://x.com/awe0_io/status/2114666959786983759)  and wired into the Forge's
phase gate.

## The problem it solves

An agent writes a spec after a long conversation. It "understands" everything — and the build still
misses the point, because nobody checked whether the **spec alone** carries the intent. By the time a
human notices, the code exists and the cost of change is high.

## The two roles

| Role | Keeps | Does |
|---|---|---|
| **Elephant** | the whole conversation, the architecture decisions | writes `GDD.md`, `BUILD.md`, `TASKS.json`, `ASSET_PLAN.md` |
| **Goldfish** | **nothing** — starts from the files only | reviews the spec cold, before any code is written |

The Goldfish must be a **different agent than the author** (a different worker id in
`/api/dispatcher/agents` is enough).

## The three checks

1. **Understanding** — from the files alone, can the reviewer explain what is being built, for whom,
   and what "done" means? If not, the spec is missing context, not the reviewer.
2. **Adversarial** — what edge cases, hidden dependencies or contradictions are unaddressed? Look for:
   two sections that disagree, an acceptance line that cannot be observed, an asset with no consumer,
   a task with no file path.
3. **Implementation readiness** — are files, data shapes and function boundaries clear enough that a
   stranger could start typing without inventing structure?

**Fail = rewrite the spec.** Not "add a note". Not "clarify in chat".

## How it slots into the Forge

| Phase | Goldfish gate |
|---|---|
| after `GDD.md` / `DES-*` | understanding + adversarial pass on the design |
| before `PRD-*` production | implementation readiness on `BUILD.md`, `ASSET_PLAN.md`, task acceptance |
| before `REL-*` | cold read of `README` + `BUILD.md`: could a stranger run and verify this? |

## What it does not do

A passed review is **not** proof the game works. It only proves the *spec* is legible. Human
acceptance, the preview screenshot, and the `REFRESH` readout remain the evidence. Reviewing is a
gate in front of the work, not a replacement for it.

## Using it here

When a QA or review task runs, the brief should name the reviewer as cold: "you have not seen this
project before; read only the files listed and answer the three checks." A reviewer that has been in
the conversation is an Elephant, and its review is worthless as a gate.
