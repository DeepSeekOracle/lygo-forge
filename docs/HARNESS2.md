# Harness² — Forge pointer

**Source:** https://x.com/akshay_pachaar/status/2111753928031531232  
**Repo:** https://github.com/google-research/harness2  
**Licence:** Apache-2.0  
**Decision:** **POINTER ONLY. No install.**

## What it is

A Google Research framework for **recursive agent harnessing**:

- **Task-level recursion:** propose harness edits, probe them on the task, compose a better harness
  from behavioural contrasts — no ground-truth grader required.
- **Harnessing-level recursion:** save the adopted harness plus evidence-supported lessons, and start
  the next task from those notes.
- Eight editable components: system prompt, guardrails, memory, tool guidance, subagents, skills,
  scripts, plugins.
- Parallel or sequential recursion; OpenCode/Codex executors; three professional benchmarks.

## Why Forge does not install it

- Model-backed benchmarks require **Vertex AI** project/credentials and incur API costs.
- Setup targets **Linux, Python 3.12, uv**; this host is Windows/Python 3.13.
- The local demo needs no credentials but is still a research harness, not a Forge tool.
- Forge already has **`lygo-harness-repair`**: observe a failure → one minimal harness edit → probe on a
  fixed case → keep only evidence-backed changes.
- Adding a second self-editing loop risks uncontrolled prompt/skill drift.

## Useful ideas

1. **Propose–Probe–Compose**: generate candidate harness edits, test behaviour on the same task,
   then combine only what evidence supports.
2. **Contrast, not ground truth**: compare runs against each other when no grader exists.
3. **Persistent improvement notes**: keep adopted edits and the lessons that held up.
4. **Editable component list**: prompt, guardrails, memory, tool guidance, subagents, skills, scripts,
   plugins — a useful audit checklist.
5. **Freeze the model weights**: harness changes only.

## If adopted later

- Run in an isolated Linux container, not against the live Forge tree.
- Use a **frozen test set** and a rollback copy.
- Never allow unattended edits to identity, security, prompts or schedules.
- Keep a human approval gate; `lygo-harness-repair` remains the Forge path.
- Do not enable paid Vertex AI without explicit approval.

## Pointers

- https://github.com/google-research/harness2
- https://arxiv.org/pdf/2610.14224
- Existing Forge path: `lygo-harness-repair`
