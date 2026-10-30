# FORGE AUDIO WORKER

## Scope

Create music, SFX, or sound edits for the assigned job using local tools and licensed sources.

## Required spec

- purpose and duration
- loop or one-shot
- format, sample rate, channels, loudness
- mood/reference and licence
- output path and acceptance

## Rules

- Prefer local synthesis and licensed/CC0 sources; no paid service.
- Record source, licence and processing chain.
- Trim silence, normalize to a consistent target, avoid clipping.
- Test the file in the game engine, not only in an audio editor.
- Do not overwrite source stems; export a new file.

## Acceptance

- file opens and duration is correct
- loop points click-free where applicable
- loudness/format match the project spec
- licence and prompt/seed/model recorded


## Free TTS pointer — Kokoro

- Repo: https://github.com/hexgrad/kokoro
- Weights: https://huggingface.co/hexgrad/Kokoro-82M
- License: Apache-2.0; 82M params; CPU-capable.
- Current status: **do not install on this host** — package metadata requires Python <3.13 and this host is Python 3.13.5. Keep Piper as the local TTS path.
- Do not claim a Kokoro render unless it actually ran on a supported interpreter/external service.
- Decision record: `docs/AI_CONTENT_FACTORY.md`.

## Bark 3.0 transcription

- Installed locally: `skills/forge-transcription-worker`, `docs/BARK30.md`.
- English ASR, CC BY 4.0; no timestamps/speaker names.
- Use for transcripts/subtitles input; Piper/Kokoro remain TTS paths.
- Command: `tools/bark_transcribe.ps1 -Audio <path> -Device cpu`.


## Forge batch contract (required)

Writer workers do **not** render audio. They write a JSON batch and hand it to the
`audio-piper` tool worker (`skill: forge-audio-worker`).

```json
{
  "overwrite": false,
  "items": [
    {"kind":"tts","id":"line-01","voice":"male","text":"...","out":"assets/voice/line-01.wav"},
    {"kind":"sfx","id":"portal-01","preset":"portal","out":"assets/sfx/portal-01.wav"}
  ]
}
```

Allowed voices: `female` (ljspeech-high), `female_alt` (lessac), `archivist` (UK alba), `male` (ryan-high).
Allowed SFX presets are the `forge-synth` list in `pipeline/audio_batch.py`.

The tool validates mono 16-bit 22.05 kHz, 0.1–20 s duration, hashes the artifact and writes a `.json`
sidecar. It refuses path traversal, unknown voices/presets, and overwrites unless `overwrite: true`.
A failed render returns non-zero; do not retry an audio job on an LLM. Re-dispatch to `audio-piper`.

## Artefact acceptance

- `AUDIO_BATCH_OK`
- every path exists under the project's `assets/voice` or `assets/sfx`
- SHA-256 and duration present in the sidecar
- no clipping/format mismatch
- the human listens before release
