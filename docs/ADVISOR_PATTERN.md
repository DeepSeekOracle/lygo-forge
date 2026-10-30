# Escalation-only advisor pattern — Forge adaptation

**Source:** https://x.com/Grirku/status/2113338950135734585  
**Decision:** adopt the **routing pattern**, reject the paid Claude Code stack.

## What the link describes

- Main session on Sonnet builds and tests.
- Three Haiku subagents do search/grep/docs.
- A deterministic router handles simple forks.
- Opus is called only **before a plan** and **when the same error repeats twice**.
- Opus never writes code; it reads the transcript and advises.
- The main model applies the diff and verifies.

## What Forge rejects

- `claude --model sonnet --advisor opus` is not free; it requires Claude Code and paid Anthropic
  model access.
- No repo or open weights are provided in the link.
- The “zero regressions” claim is unsupported.
- Forge does not install proprietary advisor models or make paid API calls.

## Free Forge translation

Use Forge’s existing free worker pool:

| Link role | Forge equivalent |
|---|---|
| Sonnet main builder | Local Qwen / opencode / free NVIDIA worker |
| Haiku search/grep/docs | Forge search, repo commands, docs lookup |
| Deterministic router | Forge dispatcher / task-owner rules |
| Opus advisor | stronger free reviewer only on escalation |
| Diff + verify | Forge QA worker + human acceptance |

## Policy

1. **One main worker** owns the task and writes the change.
2. **Search/grep/docs** stay narrow and read-only.
3. Deterministic decisions (which file, which tool, retry/stop) are made by the dispatcher, not a
   model.
4. **Escalate only when:**
   - the same failure has occurred twice, or
   - a plan/acceptance review is requested.
5. The advisor **never edits files**. It reads the evidence and returns a diagnosis.
6. The main worker applies the smallest diff, shows it, and verifies.
7. **No edits** before the operator approves the diff.
8. Record model, task, failure count, diff and test result in the job note.

## Acceptance

- cheap/default worker handled the normal path
- escalation happened only at a named trigger
- advisor produced advice, not code
- diff was shown before the edit
- tests/evidence recorded after the edit
- no paid model or hidden API was used

## Non-claims

This policy does not claim Claude Code compatibility, Sonnet/Opus/Haiku access, or “zero
regressions”. It is a free Forge dispatch policy only.
