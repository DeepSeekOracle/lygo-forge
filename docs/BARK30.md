# Underdog Bark 3.0 — Forge transcription

**Source:** https://x.com/RoundtableSpace/status/2113257816303763607  
**Official:** https://underdog.ai/bark  
**Model:** https://huggingface.co/ConwayResearch/Underdog-Bark-3.0  
**License:** CC BY 4.0  
**Decision:** **INSTALLED locally** for English speech-to-text.

## Verified install

```text
Model:  <FORGE_DIR>\tools\bark-model\model.bark
Size:   163,398,645 bytes
Venv:   <FORGE_DIR>\.venv-bark (Python 3.11, CPU torch)
Wrapper:<FORGE_DIR>\tools\bark_transcribe.ps1
```

## Real test

Spoken input:

> The quick brown fox jumps over the lazy dog. Forge transcription test, one two three.

Output:

> The quick brown fox jumps over the lazy dog. Forged transcription test one two three.

CPU runtime: **23.3s** on the second run, **34.2s** including first load/pack.

## Use

```powershell
pwsh -NoProfile -File <FORGE_DIR>\tools\bark_transcribe.ps1 `
  -Audio C:\path\recording.wav -Device cpu
```

## Limits

- English only.
- No word timestamps; no speaker diarization.
- CPU PyTorch path, not ONNX/DirectML.
- Long audio should be split into a few minutes per request.
- First use needs internet for the NVIDIA processor/generation config; model weights are already local.
- CC BY 4.0 requires attribution; preserve `NOTICE` and record the model version/hash with the transcript.

## Why it helps Forge

- Transcribe game dialogue, playtest voice notes, meeting notes and stream clips locally.
- Produce text for subtitles, QA notes or agent context.
- Small/fast compared with Whisper large-v3, and no hosted service.
- Does not create voice; Piper/Kokoro remain TTS paths.

## Pointers

- Skill: `skills/forge-transcription-worker/SKILL.md`
- Audio Worker: `forge-audio-worker`
- Wrapper: `tools/bark_transcribe.ps1`
- Official Windows instructions: https://huggingface.co/ConwayResearch/Underdog-Bark-3.0
