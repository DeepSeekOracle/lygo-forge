# FORGE STYLE LIBRARY

Use a reviewed visual style as a **brief**, then let a Forge asset worker create original work.
This skill does not generate images or films itself.

## Allowed source

- **Lemo-Opuscar** style library: https://github.com/lemomo-ai/lemo-opuscar
- Style index: https://github.com/lemomo-ai/lemo-opuscar/blob/main/styles/README.md
- Decision record: `docs/LEMO_OPUSCAR.md`
- **Code/docs:** MIT. **Demo films/stills:** CC BY 4.0 (credit LemoLab + link; say if changed).
- Requests are tuned for Claude Opus 5.5; Forge uses the **style grammar**, not the Claude plugin or film engine.

## Job contract

1. Read the project `ART_BIBLE.md`, `ASSET_PLAN.md`, the selected task and engine budget.
2. Pick one style from the library; record its exact `STYLE.md` URL.
3. Extract only what the asset worker needs:
   - palette and value logic
   - material/texture and line rules
   - camera/motion grammar (if relevant)
   - typography/cartouche rules
   - sound palette (if the job includes audio)
4. Hand the brief to the image, UI, web or audio worker. The worker creates original assets.
5. Register the output with an Asset Pointer: source style URL, licence, worker, prompt, hash, task.
6. Technical Artist validates readability, scale and engine budget.

## Rights rules

- Use the **style grammar**, never a copy of a famous print, frame, character or composition.
- Do not copy demo films or stills into a project.
- CC BY stills require LemoLab credit and a link; the generated asset itself is not automatically CC BY.
- Reference images and third-party assets keep their own licences.
- Do not reuse the three excluded demo voice tracks.
- No style reference overrides Forge's art-bible or licence gate.

## Acceptance

- style URL and licence recorded
- brief names palette/material/line/motion/type rules actually used
- output is original, not a traced or reproduced famous work
- Asset Pointer and worker note exist
- no film engine or Claude plugin is claimed as installed by Forge

## Game Art Style atlas

- Reference: https://gameartstyle.loopyhop.com/ (37 styles, 104 games, global art-direction prompts).
- Screenshots belong to rights holders; study only, never copy/trace/use as textures or training data.
- Re-author prompts for the project and record the style/URL in `ART_BIBLE.md`.
- Details: `docs/GAME_ART_STYLE.md`.
