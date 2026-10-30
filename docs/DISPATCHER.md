# LYGO Forge Dispatcher

## Roles

| Role | Who | Responsibility |
|---|---|---|
| Forge Master | Hermes / operator | Creates jobs, picks worker, reviews returns, accepts/rework, assembles final |
| Dispatcher | Forge service | Deterministic routing and state |
| Worker | Any linked model/agent | Executes one job against one skill |
| Human | Steward | Final acceptance/rejection |

## Lifecycle

```
queued -> working -> returned -> accepted -> done
                  \-> failed -> retry
        \-> dispatched (remote bus posted; not complete)
```

- `returned` is worker output, not acceptance.
- Only the Master/operator accepts.
- A rework appends a note to the brief and re-queues.
- A remote shared-bus job is `dispatched`, never falsely `done`.

## Worker contract

Every job carries:

```json
{
  "id": "JOB-...",
  "project": "lattice-arena",
  "project_path": "D:\\chatagent\\games\\lattice-arena",
  "title": "...",
  "brief": "...",
  "skill": "forge-qa-worker",
  "agent": "local-qwen",
  "status": "working"
}
```

The worker gets the skill document from `skills/<skill>/SKILL.md` and must return:

- RESULT
- FILES CHANGED
- EVIDENCE
- BLOCKERS

## Agent classes

- **local** — OpenAI-compatible local endpoint; offline fallback.
- **nvidia** — free NVIDIA bridge; no credits.
- **opencode** — CLI worker with project tools.
- **shared** — stream PC task bus; remote posting.
- **master** — Hermes/overseer, not a generic worker.
- **ui** — detected but not dispatchable (ChatRTX).

## Worker acceptance rules

- Empty output = fail.
- No evidence = rework.
- Out-of-scope edit = rework or reject.
- A blocker stops acceptance.
- No publishing, deployment, purchase or credential change from a worker.

## Stream PC

Forge posts to:

```text
<DRIVE_D>\LYGO_SHARED
```

The stream worker returns through the shared outbox. Forge marks that state `dispatched`
until a real returned result exists. It does not invent completion.

## ChatRTX

ChatRTX 0.5 is a TensorRT-LLM reference app with a UI. It has no installed local API server
in this machine's install, so the Dispatcher lists it as `ui-only` and excludes it.
It is not deleted, and it is not assigned compute.


## Escalation-only advisor

Forge uses the free version of the advisor pattern: the normal worker writes, deterministic rules route simple forks, and a stronger free reviewer is called only after the same failure twice or before plan/acceptance. The advisor never edits; the main worker applies the diff and verifies. See `docs/ADVISOR_PATTERN.md`.

## Worker health: blocked 2026-10-28 01:10

Measured while trying to run one asset/build job end to end:

| Worker | Result | Evidence |
|---|---|---|
| `gemini-3-flash` / `gemini-flash-lite` | **quota exceeded** | runner raises `RuntimeError: Gemini quota exceeded for gemini-3-flash-preview` after 1.7 s |
| `opencode-*` | **provider error** | `opencode run --auto --model opencode/deepseek-v3.1 "…"` exits **1.2 s**, code 1, `UnknownError … "Unexpected server error"` (ref err_1717c520) |
| `nvidia-glm`, `groq`, `local-qwen` | healthy **but cannot write files** | API completions return text; dispatch now refuses them for build skills |

**Consequence:** the dispatcher is correct, the board is correct, and *nothing can produce files* until one
writing worker recovers. The earlier "hanging for 30 minutes" was this: a Gemini job failed on quota, was
retried onto OpenCode, whose process lingers while its provider has already failed.

### Fix order
1. Wait for the Gemini free-tier quota window, or add a second key (`keys.gemini` in the console api.json).
2. Repair OpenCode auth/provider (`opencode auth`), then re-test with the same 1.2 s check.
3. Only then expect `PROOF.md`-style jobs to complete; the stall detector will keep failing them honestly
   until a writer is healthy.

## Autonomous loop (2026-10-28) — closed and verified

The board now advances without a human. One supervisor tick does four things:

1. **stall** — a working job with no file activity for `stall_seconds` is killed and requeued
   (or failed once `max_attempts` is spent).
2. **retry** — only failures inside `retry_window_seconds` (30 min), max `max_retries_per_tick`,
   on a different worker. History is never revived.
3. **dispatch** — a queued job with no worker is dispatched; when the board is idle the next task whose
   dependencies are done is dispatched with its real brief.
4. **apply** — a returned job with a linked task appends evidence and marks the task **done**, but only
   when the project changed during the job window or the result names a file that exists.

### The two guards that matter

| Guard | Rule | Verified |
|---|---|---|
| worker capability | a job linked to a board task **must** go to a file-writing worker (opencode/gemini CLI). API agents are refused: "no file-writing worker free for a build task". | ART-03 was re-dispatched from `nvidia-glm` to `opencode-deepseek` |
| evidence | prose cannot close a task. `JOB-GATE-A` ("records prepared…") → **NOT closed**; `JOB-GATE-B` (real `assets/gate-test.png`) → **marked done** with evidence | both branches run 2026-10-28 |

Without the evidence gate, ART-03 was closed by a worker that wrote zero files (assets stayed at 5).
That is the failure mode this project keeps punishing, so it is now a hard gate.

### Front-chat control

`▶ AUTORUN` sits in the build-desk composer next to *Ask Hermes*, on the same screen used to talk to the
Master. It toggles `/api/dispatcher/auto` for the open project and the line beside it shows the live
state (`AUTORUN · working ART-03 · Produce the assets`), polling every 5 s. The Dispatcher window keeps
its own controls for manual/specific dispatch.

## Master escalation (2026-10-28)

Whatever fails, the Master finishes. Pass 5 of the supervisor watches for jobs that are
`failed`/`timeout` **and** have spent `max_attempts` **and** carry a board task, then creates:

```
title  MASTER -> <TASK> · <title>
gate   MASTER
task   <TASK>            (so pass 4 applies it under the same evidence gate)
worker agent whose skills include `forge-master`, else a file-writing worker not yet tried
brief  the task + every failure so far + "you are the Forge Master, finish it yourself"
```

Measured 2026-10-28 with a spent `ART-03` failure (attempts 3, `opencode-deepseek`, stalled):

```
ART-03 escalated to MASTER on gemini-3-pro as JOB-DAA1CECE
JOB-DAA1CECE working  gemini-3-flash  MASTER -> ART-03 · Produce the assets
```

Guards:
- **no escalation loops** — a job whose `gate` is `MASTER` (or whose title starts with `MASTER`) is
  never escalated again. Verified: a seeded failed MASTER job produced **zero** actions.
- **one escalation per tick**, so a dead board cannot fan out.
- the action message reports the worker that *actually* took the job, not the one that was preferred.
- escalation still respects the evidence gate: the master job's prose cannot close the task.

The Master path is a dispatcher job, not the chat, so it is visible in the Dispatcher window like any
other job. Hermes (the file-writing master agent) is installed and available as a further fallback if
no CLI writer is ready.
