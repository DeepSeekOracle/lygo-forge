# Plenio Music Production System — Forge note

**Source:** https://x.com/aiaicreate/status/2111279592300527837  
**Repo:** https://github.com/jplenio/Plenio-Music-Production-System  
**Code licence:** Apache-2.0  
**Decision:** **POINTER ONLY. No install.**

## Why not adopted

Plenio is an impressive ComfyUI song studio (lyrics, score, stems, mastering, player), but its
main music weights are not suitable for Forge’s commercial game output:

- **YuE2 / YuE2-VAE / SheetSage2 / instrumental adapter:** CC BY-NC 4.0 — **non-commercial**
- **MiniMax Music 3:** MiniMax-Music3 Community License with commercial conditions
- Requires ComfyUI 0.37+; 8 GB needs int8/offloading and short songs
- Forge’s ComfyUI is already carrying Wan 2.2 + Ming TTS

Forge already has:

- **Audio Studio MCP / Stable Audio 3** — local BGM/SFX under the Stability AI Community License
- **Ming 3.0 TTS** — local voices
- **Sonicproof** — audio QA

## If a non-commercial project is intended

Plenio could be installed in a **separate ComfyUI environment** and used only within CC BY-NC terms.
Do not ship its YuE2 output in a commercial game.

## Forge rules

- No CC BY-NC audio in a commercial build.
- No MiniMax Music 3 claims without its licence review.
- Keep music model weights and licences in the release record.
- One heavy ComfyUI model at a time; 8 GB needs int8/offload.

## Pointers

- https://github.com/jplenio/Plenio-Music-Production-System
- `docs/AUDIO_STUDIO.md` / `forge-audio-studio`
- `forge-sonicproof`
