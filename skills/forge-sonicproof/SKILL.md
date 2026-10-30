# FORGE SONICPROOF

Local audio QA: prompt fit, take ranking, technical checks, picture fit and library search.

## Installed

```text
Package:  sonicproof 0.1.2
Licence:  MIT
CLI:      <USER>\.local\bin\sp.exe
Model:    google/embeddinggemma-2 (~1.5 GB, Apache-2.0), cached
Runtime:  Python 3.11, CPU PyTorch 2.14.1
```

No API key, no cloud upload. CPU inference is slower; a CUDA build of torch **and** torchvision is
needed for GPU.

## Commands

```powershell
sp qc take.wav
sp check take.wav "a wooden door creaking open"
sp rank "a wooden door creaking open" v1.wav v2.wav v3.wav v4.wav
sp report take.wav "footsteps on gravel" --strict
sp fit take.wav --image kitchen.png
sp fit take.wav --video storm.mp4 "a stormy night"
sp index D:\SFX
sp search "rain on a tin roof" --in D:\SFX
sp dedupe D:\SFX
```

Every analysis command supports `--json`.

## Verified

Ming TTS test clip:

```text
QC:     -28.4 LUFS (quiet; normalize +12.4 dB to -16 LUFS)
        true peak -13.2 dBTP, no clipping
        leading silence 0.19 s (trim)
        trailing silence 0.29 s, natural decay, no clicks
Check:  STRONG +6.45σ for "a man saying a voice check"
```

That is exactly the kind of fix a generated take needs before shipping.

## Forge rules

- **Generate several takes, then rank** — do not keep the first render by default.
- Run `qc` before delivery; fix loudness, leading silence, clipping, DC, clicks and tails.
- Use `report --strict` for a ship/review/redo gate.
- Use `fit` to check whether a sound suits concept art or a video frame.
- Sonicproof is a **second opinion**, not a licensor or a final listener.
- Always listen before shipping; scores do not prove taste.
- Keep source recordings and generated takes; do not let `dedupe` delete originals.
- Do not claim the model is GPU-accelerated on this host; it is CPU-only.

## Acceptance

- no clipping and true peak below 0 dBTP
- loudness appropriate for the target (e.g. -16 LUFS for games/web)
- no leading silence on one-shots
- natural tail, no click
- prompt-fit verdict recorded
- a human listened to the final pick
