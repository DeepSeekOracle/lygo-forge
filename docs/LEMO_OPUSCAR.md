# Lemo-Opuscar — Forge style-library pointer

**Source:** https://x.com/zmdsb259414/status/2113152596819193938  
**Repo:** https://github.com/lemomo-ai/lemo-opuscar  
**Style file:** https://github.com/lemomo-ai/lemo-opuscar/blob/main/styles/ukiyoe/STYLE.md

## Decision

**POINTER / style library. Do not install the full film framework.**

- The repository is a 59-style film-making framework tuned for **Claude Opus 5.5**.
- It renders films frame-by-frame with Node, WebGL/canvas, ffmpeg and Python.
- Its full engine is not needed by Forge and would duplicate Forge's own asset pipeline.
- The **style prompts** are useful as reviewed art-direction references for Forge image, UI
  and web workers.

## Licence

- **Code and docs: MIT.**
- **Demo films and stills: CC BY 4.0**; credit LemoLab and link the repo if reused, and say if changed.
- **Films made with the library: yours, no credit required.**
- Third-party assets and three voice tracks keep their own terms; do not reuse the excluded voice tracks.
- Never reproduce a specific famous woodblock print (for example *The Great Wave*, *Red Fuji*,
  *Sudden Shower over Ōhashi*) or copy their characters/compositions. Use the grammar, not the artwork.

## What Forge uses

- Style **grammar and prompt structure** from `styles/<style>/STYLE.md`.
- Palette, material, camera, motion, sound and typography rules as a design brief.
- Style index: https://github.com/lemomo-ai/lemo-opuscar/blob/main/styles/README.md
- Gallery: https://lemomo-ai.github.io/lemo-opuscar/
- Ukiyo-e brief: https://github.com/lemomo-ai/lemo-opuscar/blob/main/styles/ukiyoe/STYLE.md

## What Forge does not do

- Does not install Node/WebGL/ffmpeg film engine or the Claude plugin.
- Does not copy demo films or stills into projects.
- Does not reproduce identifiable famous prints.
- Does not treat a style prompt as a licence for reference images or third-party characters.

## Forge handoff

1. Art Director selects a style from the library and records its URL.
2. Image/UI/Web worker receives a short style brief (palette, materials, line, motion, typography).
3. Worker creates original assets; reference images must have their own provenance.
4. Asset Pointer records style URL, licence, worker, prompt and generated asset hash.
5. Technical Artist validates readability and engine budget.

## Requirements if the film engine is ever run separately

- Node 20+, ffmpeg, Python 3.11+.
- It is tuned for Claude Opus 5.5; other models may not reproduce the styles.
- A film can take 30–60 minutes and substantial tokens. This is not a Forge worker dependency.
