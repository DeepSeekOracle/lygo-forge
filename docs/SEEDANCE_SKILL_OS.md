# Seedance 2.0 Skill OS — Forge pointer

**Source:** https://x.com/bkdgiffug/status/2112303527720530034  
**Repo:** https://github.com/Emily2040/seedance-2.0  
**Licence:** MIT  
**Decision:** **POINTER ONLY. No install.**

## What it is

A 28-sub-skill “Skill OS” for directing Seedance 2.0 video prompts:

- shot tables: camera, in-frame, eye-line, action, others, light, last frame
- continuity and reference-role mapping
- continuation from accepted footage
- retake protocol with one-variable changes
- moderation pre-screen and copyright handling
- 15-second short-drama examples in six languages

The repo is explicit: **your video provider handles generation and its costs**.

## Why Forge does not install it

- It targets **Seedance 2.0**, a hosted provider; Forge uses local Wan 2.2.
- 28 sub-skills and a large reference library would bloat Forge for a provider Forge does not use.
- Its live evaluation needs a provider key and paid calls.
- Forge already has `forge-camera-language`, `forge-motion-prompt-library` and cinematic workflow docs.
- No need to duplicate a provider-specific routing layer.

## Useful method to borrow

1. Build a **shot table** before writing prompts.
2. One action per shot; everyone else keeps living in the background.
3. Lock light, people and positions at the end of every shot.
4. Start a continuation from the **accepted clip’s real ending**, not the original plan.
5. Change **one variable** per retake; keep an attempt budget.
6. Pre-screen prompts for moderation/copyright before spending a render.
7. Treat an unrendered prompt as an unproven plan.

## Forge use

Use the shot-table method with `forge-camera-language` and local Wan 2.2. Do not call Seedance or put a provider key in Forge.

## Pointers

- https://github.com/Emily2040/seedance-2.0
- `forge-camera-language`, `forge-motion-prompt-library`
- `docs/OPUS55_PROMPTS.md`
