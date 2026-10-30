# FORGE MOTION PROMPT LIBRARY

Use motion/animation prompt references as **technique briefs** for original Forge work.
This skill never installs or copies a creator's video, still or prompt verbatim.

## Source

- https://github.com/yihui-dev/awesome-opus5-5-videos
- https://github.com/billyhetech/awesome-opus5-5-videos
- Decision record: `docs/OPUS55_PROMPTS.md`
- Categories: motion graphics, explainers, 3D scenes, games/interactive, long-form, music videos.
- Repository code/docs: MIT. **Prompts and videos remain creator-owned.**

## Job contract

1. Read the project's `GAME.md`, `ART_BIBLE.md`, `TECH_SPEC.md`, selected task and engine budget.
2. Choose one category and one reference prompt; open its `prompts/*.md` file.
3. Extract the **technique**:
   - camera/motion grammar
   - timing, easing and interaction model
   - rendering stack that fits the project (HTML/Canvas/SVG/Three.js/GLSL/Web Audio)
   - sound/music role, if the job includes audio
4. Rewrite the brief for the project's own art direction and engine. Do not copy the creator's
   characters, brands, footage, or exact prompt text.
5. Hand to the web/UI/game worker. The worker writes and tests original code.
6. Record source URL, creator, technique used and output hash in the job note / Asset Pointer.

## Rights

- Do not download or redistribute the referenced videos/stills.
- Do not reproduce a recognizable third-party game, brand or character.
- The collection's MIT licence does not relicense the prompts/videos.
- A prompt is not an asset licence; image/audio assets need their own provenance.

## Acceptance

- technique brief is original and specific
- target engine/version and acceptance test named
- original code/assets delivered
- source and creator recorded
- no copied video still, brand asset, or verbatim prompt in the build
- no claim that Forge runs Claude Opus 5.5

## Reviewed motion-design references

- LottieFiles motion-design-skill — MIT; timing/easing/choreography.
- greensock/gsap-skills — MIT; official GSAP patterns for web/UI.
- dylantarre/animation-principles — MIT; 12-principles review vocabulary.
- Remotion skills — licence unverified; reference only, do not install.
- Index: `docs/MOTION_DESIGN_INDEX.md`.
- Do not bulk-load 20/55/144 skills; select only what the job needs and re-author.

## Camera language

- Use `forge-camera-language` for framing/move names: dolly in, orbit, rack focus, whip pan, etc.
- One primary move per shot; specify start/end frames; do not stack moves.
