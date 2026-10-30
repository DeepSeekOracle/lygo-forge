# BARK 3.0 TRANSCRIPTION WORKER

Transcribe a game/meeting/stream audio file locally with Underdog Bark 3.0.
This is a **speech-to-text** worker, not a voice generator.

## Installed tool

```text
Model:  <FORGE_DIR>\tools\bark-model
Venv:   <FORGE_DIR>\.venv-bark
Script: <FORGE_DIR>\.venv-bark\Scripts\python.exe
        <FORGE_DIR>\tools\bark-model\runtime\transcribe_bark.py
```

## Command

```powershell
<FORGE_DIR>\.venv-bark\Scripts\python.exe `
  <FORGE_DIR>\tools\bark-model\runtime\transcribe_bark.py `
  --model <FORGE_DIR>\tools\bark-model `
  --audio <path-to-wav-or-audio> `
  --device cpu
```

Helper:

```powershell
pwsh -NoProfile -File <FORGE_DIR>\tools\bark_transcribe.ps1 -Audio <path> -Device cpu
```

## Verified

- Spoken WAV: *“The quick brown fox jumps over the lazy dog. Forge transcription test, one two three.”*
- Output: `The quick brown fox jumps over the lazy dog. Forged transcription test one two three.`
- CPU run: **34.2 seconds** including first model load.
- Model file: **163,398,645 bytes**.

## Limits

- **English only.**
- No word timestamps and no speaker diarization.
- CPU runtime is a local PyTorch path; not an ONNX/DirectML or low-bit CUDA export.
- First use downloads the NVIDIA processor/generation config (not another model weight set).
- Keep recordings to a few minutes per request; split long audio.
- Model is CC BY 4.0; preserve `NOTICE` attribution and record the model hash in the job note.

## Rules

- Local transcription only; do not send private audio to a hosted service.
- Do not claim timestamps or speaker names.
- Do not overwrite the source audio; write a transcript beside it.
- Do not use this as a TTS/voice generator.
- Keep the transcript and model/version with the job evidence.
