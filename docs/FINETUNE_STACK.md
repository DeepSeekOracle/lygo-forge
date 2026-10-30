# Fine-tuning stack — Forge pointer

**Source:** https://x.com/RoundtableSpace/status/2112986024041459839  
**Decision:** **POINTER ONLY. No training stack installed.**

## The five repos

| Repo | Licence | Role |
|---|---|---|
| [LLaMA-Factory](https://github.com/hiyouga/LLaMA-Factory) | Apache-2.0 | unified fine-tune UI/CLI for 100+ LLMs/VLMs |
| [Unsloth](https://github.com/unslothai/unsloth) | Apache-2.0 (core); optional studio/CLI AGPLv3 | fast QLoRA/LoRA |
| [Axolotl](https://github.com/axolotl-ai-cloud/axolotl) | Apache-2.0 | config-driven training |
| [PEFT](https://github.com/huggingface/peft) | Apache-2.0 | adapters/LoRA library |
| [TRL](https://github.com/huggingface/trl) | Apache-2.0 | SFT/DPO/RLHF training |

## Why not installed now

- Forge’s current job is **inference and asset production**, not training.
- The host has an **8 GB RTX 4060 Ti**; full fine-tuning is out. Only small QLoRA adapters are plausible.
- Installing all five duplicates one another and pulls large CUDA/PyTorch dependencies.
- A fine-tune needs a **clean, licensed dataset**, an eval set and a measurable target—none is part of the current Forge build.
- Unsloth’s optional studio/CLI is AGPLv3; keep that out of Forge if the core is ever used.

## When to revisit

Only when a concrete job exists, for example:

- a small task model needs a narrow tool-calling format
- a game-specific classifier or intent router
- a style/persona adapter with a licensed dataset

Then:

1. Use `llmfit` to confirm the base model fits with QLoRA headroom.
2. Start with **Unsloth core** or **PEFT** for a 4B-class adapter; not all five.
3. Freeze a small train/eval set; record dataset licence and hashes.
4. Train on a separate environment; keep Forge’s runtime clean.
5. Evaluate against the frozen set and a held-out set.
6. Export an adapter/GGUF only after license and quality checks.
7. Record base model, adapter, dataset, hyperparameters and eval evidence.

## Rules

- No training data without provenance.
- No full fine-tune on this 8 GB host.
- No AGPL studio/CLI bundled into Forge.
- No claim of improvement without held-out evaluation.
- No paid API or hosted trainer required.

## Pointers

- Source: https://x.com/RoundtableSpace/status/2112986024041459839
- `forge-model-fit` skill for hardware feasibility
- `docs/ADVISOR_PATTERN.md` for evaluation/escalation discipline
