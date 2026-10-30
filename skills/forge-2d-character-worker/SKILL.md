# FORGE 2D CHARACTER WORKER

## Output

- sprite sheet or layered character source
- idle/move/attack/hit/death frames
- pivot and ground-contact metadata
- palette/style reference

## Rules

- Character identity stays consistent across frames.
- Transparent PNG, clean edges, no halo.
- 8–12 fps pixel; 24–30 fps HD vector.
- Same pivot and scale in every frame.
- Record generation model/prompt/seed and licence.

## Acceptance

- sheet loads and animates in-game
- silhouette reads at gameplay distance
- no frame drift or alpha artifacts

## Pixelorama tool

- Installed: `tools/Pixelorama/Pixelorama-Windows-64bit/Pixelorama.exe` (v1.2.3, MIT).
- GUI editor for pixel layers, tilemaps, palettes, animation frames and sprite-sheet export.
- Generate/source base, edit in Pixelorama, export PNG/sheet, record version/palette/frame tags, then verify the import.
- No headless CLI claim; do not overwrite source `.pxo` files.
- Details: `docs/PIXELORAMA.md`.
