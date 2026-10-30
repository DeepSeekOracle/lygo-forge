# VoiceStudio — Forge pointer

**Source:** https://x.com/hurricodes/status/2113344200578158874  
**Repo:** https://github.com/debpalash/VoiceStudio  
**Code licence:** AGPL-3.0  
**Decision:** **POINTER ONLY. No install.**

## What it is

A local ElevenLabs-style voice application:

- voice cloning from a reference sample
- voice design
- video dubbing
- dictation / transcription
- audiobook creation
- multiple local TTS engines
- local API + MCP
- 646-language claim, largely via translation/dubbing pipelines

## Why Forge does not install it

- **AGPL-3.0** application; not safe to bundle into the Forge exe.
- Electron desktop app with a Python backend; a new runtime, not a lightweight worker.
- Forge already has **Ming 3.0 TTS** for local voices and **Audio Studio** for music/SFX.
- Model weights, tokenizers and voices have **separate licences**; AGPL does not grant them.
- The 646-language claim has not been verified here; translation quality and voice coverage vary by engine.
- Voice cloning needs explicit consent and rights.

## If used externally

- Install the desktop app separately; keep it out of Forge.
- Use its local API/MCP only on loopback.
- Record engine, model, language and voice rights.
- Verify output with **Sonicproof**.
- Never clone a real person without permission.
- Do not redistribute the AGPL app or its models inside a commercial build.

## Forge path today

- **Ming 3.0 TTS 0.5B** — local character voice, cloning, emotion
- **Audio Studio / Stable Audio 3** — BGM/SFX
- **Sonicproof** — audio QA
- No 646-language claim is made by Forge.

## Pointers

- https://github.com/debpalash/VoiceStudio
- `forge-ming-tts`
- `forge-audio-studio`
- `forge-sonicproof`
