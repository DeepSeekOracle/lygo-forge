# Awesome Opus 5.5 Videos — Forge pointer

**Source:** https://x.com/RoundtableSpace/status/2113461658580308354  
**Quoted source:** https://x.com/pengsonal/status/2113167266091307150  
**Repo:** https://github.com/yihui-dev/awesome-opus5-5-videos  
**Larger index:** https://github.com/billyhetech/awesome-opus5-5-videos

## Decision

**POINTER / motion-prompt reference. No app or video assets installed.**

The collection indexes 703 prompts (418 with live remakes) for code-rendered
animations: cinematic motion graphics, explainers, 3D scenes, interactive games,
long-form pieces and music videos. The larger index tracks 2,504 videos.

## Why it helps Forge

- Motion-graphics structure for UI, web and game prototypes.
- Camera, timing, sound and interaction patterns that can be re-authored in code.
- Examples for HTML/Canvas/SVG/Three.js/GSAP/GLSL/Web Audio workflows.
- Prompt files can show a useful decomposition of a visual brief.

## Rights

- **Repository code/docs: MIT.**
- **Prompts and videos belong to their original creators**, linked per entry. The repo does not
  grant a licence to those works.
- Do not copy a creator's video, still, character, brand or prompt wholesale into a Forge game.
- Re-author the **technique**; record the source URL, creator and a review note.
- No paid tools or accounts required for the reference itself.

## Forge use

1. Pick a category: motion graphics, explainer, 3D scene, game/interactive, long-form, music video.
2. Open the prompt file; read the technique, not for literal copying.
3. Hand a short technique brief to the web/UI/game worker.
4. Worker writes original code and assets; validates in the target engine.
5. Record the source URL/creator in the job note and Asset Pointer.

## Limits

- Prompts are tuned for Claude Opus 5.5; Forge workers use their assigned models and may need
  adaptation.
- Some prompts are partial or describe the result rather than give a complete prompt.
- The live remakes are on a third-party site; do not depend on it for a build.
- No video/asset download is part of this skill.

## Pointers

- Prompt folder: https://github.com/yihui-dev/awesome-opus5-5-videos/tree/main/prompts
- Data: https://github.com/yihui-dev/awesome-opus5-5-videos/blob/main/data/videos.json
- Licence: https://github.com/yihui-dev/awesome-opus5-5-videos/blob/main/LICENSE
- Skill: `skills/forge-motion-prompt-library/SKILL.md`
