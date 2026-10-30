# AI Content Factory list — Forge intake

**Source:** https://x.com/Shoumya23/status/2113314222339916268  
**Date:** 2026-10-23  
**Rule:** free only; no paid APIs, subscriptions, or credits.

## Decisions

| Repo | Decision | Reason |
|---|---|---|
| OpenCreator | **DISREGARD** | Apache-2.0, but a full Codex-dependent creative workspace that duplicates Forge's canvas, jobs, and asset pipeline. Requires ChatGPT/Codex login or API credentials. |
| Research Skills (`ScrapeCreators`) | **DISREGARD** | The linked location is a GitHub **organization**, not a repo; `/ScrapeCreators/research-skills` is **404**. No usable source to install. |
| Local Deep Research | **POINTER** | MIT, local/private research with citations. Useful for research tasks, but requires Docker or pip plus Ollama/OpenAI-compatible LLM and SearXNG; not installed. |
| FLUX.2 / FLUX | **DISREGARD as a Forge install** | The listed repo is FLUX.1. `schnell` is Apache-2.0, but `dev`/tools are **non-commercial** without a paid licence; heavy and duplicates Forge's Qwen-Image image worker. |
| Kokoro | **POINTER** | Apache-2.0 code and weights, 82M, CPU-capable TTS. Current PyPI releases require **Python >=3.10,<3.13**; this Forge host has only Python 3.13. Not forced/installed. |

## Local Deep Research pointer

- Repo: https://github.com/LearningCircuit/local-deep-research
- License: MIT
- Free/local modes: Ollama, LM Studio, llama.cpp OpenAI endpoints; SearXNG; academic sources.
- Why not installed: separate web service, SQLCipher/auth, Docker or pip dependencies, Ollama + SearXNG. Forge already has research workers and the Engine API.
- Use as an **external research reference/service** only when the operator chooses to run it; no bundled install.

## Kokoro pointer

- Repo: https://github.com/hexgrad/kokoro
- Weights: https://huggingface.co/hexgrad/Kokoro-82M
- License: Apache-2.0
- 82M parameters; CPU-capable; `espeak-ng` is already installed here.
- Blocker: `kokoro` and `misaki` currently declare `Requires-Python <3.13`; host Python is 3.13.5. Do not force an unsupported install.
- Free demo/model page may be used manually, but no local Forge audio job may claim Kokoro until a supported interpreter is installed.
- Forge audio worker remains **Piper/local synthesis first**.

## FLUX licence note

- `FLUX.1 [schnell]` is Apache-2.0.
- `FLUX.1 [dev]`, Fill, Canny, Depth, Redux, Kontext and Krea are **FLUX.1-dev Non-Commercial** unless a separate commercial licence is purchased.
- This Forge build will not add FLUX dev weights or treat them as a free commercial asset source.

## Forge outcome

- No full app installed.
- No paid API adopted.
- Added pointers only where they help research or future TTS work.
- Forge's existing local image/audio workers remain the production path.
