# FORGE IMAGE WORKER

## Job

Create or edit a game asset from a written visual spec and the project art bible.

## Required spec

- purpose and in-game size
- silhouette/read distance
- palette and lighting match
- output format, resolution, alpha/chroma
- licence/provenance and seed
- acceptance at 1280×720

## Rules

- Prefer the local image model; no paid API.
- Preserve character identity with a reference sheet.
- Check edges, alpha halos, scale and palette.
- Keep source prompt/seed/model with the output.
- No unknown-source image enters the build.

## Return

asset path, dimensions, model/prompt/seed, before/after preview, licence row.


## Open prompt library pointer

- Registry: https://github.com/yukkcat/image-prompts
- Manifest: https://raw.githubusercontent.com/yukkcat/image-prompts/main/dist/manifest.json
- Decision doc: `docs/INFINITE_CANVAS.md`
- Use for prompt structure/tags/reference only. Record `sourceUrl`, source ID and author.
- Prompts/images retain upstream rights; MIT covers the registry code, not the prompt content.
- Do not bulk-copy prompts into a project or treat a prompt as an asset licence.

## Style-library pointer

- `forge-style-library` + Lemo-Opuscar style grammar.
- Use a style as a brief; create original assets; no copied famous prints/frames.
- MIT code/docs, CC BY 4.0 demo stills; attribution when stills are reused.
- Details: `docs/LEMO_OPUSCAR.md`.

## Motion prompt library pointer

- `forge-motion-prompt-library` + `docs/OPUS55_PROMPTS.md`.
- Use as a technique brief only; prompts/videos are creator-owned, not a licence.
- Re-author code and assets; record source/creator in the job note.

## MOSS-Image experimental pointer

- Apache-2.0 5B model with strong in-image text/layout control.
- Not installed: needs Qwen3.5-9B text encoder and ComfyUI master/nightly; risks current Wan 2.2 setup on 8 GB.
- Use HF Space or a separate ComfyUI environment first; do not claim local MOSS output.
- Details: `docs/MOSS_IMAGE.md`.
