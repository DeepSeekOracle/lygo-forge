# Izumi — Forge architecture pointer

**Source:** https://x.com/CY160909/status/2112684034467975501  
**Repo:** https://github.com/GoogleCloudPlatform/genmedia-izumi-agent  
**Licence:** Apache-2.0  
**Decision:** **POINTER ONLY. No install.**

## What it is

A Google Cloud reference architecture for automated video ads:

- **AI Director** plans narrative, pacing and scene length
- **Look library** of 15 art-direction recipes bound across scenes
- **Review checkpoints** after strategy, storyboard and final cut
- agents for ads, co-director research, character consistency and a creative toolbox

## Why it is not installed

- Runtime is **Vertex AI**: Gemini, Imagen, Veo, Lyria, Gemini TTS.
- Requires a Google Cloud project, application-default credentials, Firestore and GCS.
- All generation is **paid**; the repo is a cloud reference, not a free local app.
- Forge already has a free local image/video path and must not acquire metered cloud calls.
- Python 3.12/FastAPI/React monorepo is far larger than a Forge tool.

## What Forge can reuse as ideas

1. **AI Director pacing**: narrative + exact scene count + per-scene duration before generation.
2. **Look library**: bind one look to every shot so lens/lighting/colour/music stay coherent.
3. **Review gates**: strategy → storyboard → final cut, with human approval.
4. **Character anchoring**: persistent subject references across generated clips.
5. **Campaign brief structure**: audience, product, format, duration, tone, hook.

Do not copy its prompts/assets; re-author for Forge’s art bible.

## If a free/local variant is ever built

- Use Forge’s local Qwen-Image/Wan 2.2 path, not Vertex AI.
- Keep the director/pacing/look concepts; replace every cloud model.
- No paid API by default; a cloud route only with explicit approval.
- Record which model produced each shot.

## Pointers

- https://github.com/GoogleCloudPlatform/genmedia-izumi-agent
- Forge: `docs/OPUS55_PROMPTS.md`, `docs/AI_CONTENT_FACTORY.md`, `forge-motion-prompt-library`
