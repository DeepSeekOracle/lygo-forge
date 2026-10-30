# FORGE AUDIO STUDIO MCP

Local Stable Audio 3 generation for BGM, instrument loops and sound effects. No cloud, no API key,
no per-generation charge.

## Installed

```text
Path:    <FORGE_DIR>\tools\audio-studio-mcp
Code:    MIT
Model:   stabilityai/stable-audio-3-medium (~10.4 GB, gated)
Licence: Stability AI Community License
Runtime: Python 3.11 + PyTorch 2.7.1+cu126 + CUDA
VRAM:    ~5.3 GB peak on an RTX 3060; fits the 8 GB 4060 Ti
Outputs: 44.1 kHz, 24-bit stereo WAV + JSON sidecar
```

The weights are gated and were downloaded under the logged-in HF account. The Stability AI Community
License permits commercial use for individuals/organisations **under US$1M annual revenue**; read the
licence before shipping.

## Tools

- `generate_audio` — BGM, instrument loops, SFX; 1–4 candidates; `bpm`; structured SFX fields
- `edit_audio` — variation, inpaint a time range, continue/extend
- `process_audio` — trim, silence trim, mono, resample, loudness, seamless loop, fades, peak ceiling, WAV/OGG/FLAC
- `unload_models` — free VRAM immediately

## Verified

`scripts/smoke_test.py` passed:

```text
16 files generated
20 s synthwave music, 20 s variation, inpaint, loop/process
variation: 39.85 s wall, RTF 0.5, medium + same-l
unload_models: true
```

## Important: one heavy engine at a time

Audio Studio peaks around 5.3 GB VRAM. ComfyUI/Wan/Ming cannot hold their models at the same time.
Before an Audio Studio batch:

1. Stop ComfyUI or unload its models.
2. Generate.
3. Call `unload_models`.
4. Restart ComfyUI only when needed.

Do not run both at once on this 8 GB card.

## Prompting

**Music:** genre + adjectives → lead instruments → layers → drums → mood. Put BPM in the tool field.

**SFX:** source + action + material + space, e.g. `source: glass bottle / action: shattering on impact / material: thick green glass / space: concrete floor, close-up, dry`.

Use 2–4 variations and pick the best seed. Audio Studio cannot sing or produce lyrics.

## Forge rules

- Record prompt, seed, model and settings from the `.json` sidecar.
- Run Sonicproof `qc` and `check` on the chosen take before delivery.
- Normalize game BGM to about **-16 LUFS**, SFX by peak.
- No vocals/lyrics claims.
- Model licence is not MIT; the code is. Read the Stability AI Community License before commercial release.
- Do not bundle the weights into the Forge exe.
- Keep generated audio and sidecars together.

## Acceptance

- audible, on-brief take
- no clipping; true peak below 0 dBTP
- no unintended silence or cut tail
- loop seam checked with `--loop` in Sonicproof
- source/seed/licence recorded
- a human listened
