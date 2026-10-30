# FORGE 2D MAP WORKER

## Output

- tilemap or layered map source
- collision/objects layer
- spawn/exit/landmark metadata
- preview at gameplay resolution

## Rules

- One logical tile size and one camera scale.
- Teach one verb per space; blockout before decoration.
- Keep tiles seamless and palette-consistent with the art bible.
- Match collision to the visual edge.
- Record tileset licence and source.

## Acceptance

- map loads in the engine/slice
- collision and spawns work
- no missing tile or broken seam in the preview

## Pixelorama tool

- Installed: `tools/Pixelorama/Pixelorama-Windows-64bit/Pixelorama.exe` (v1.2.3, MIT).
- GUI editor for pixel layers, tilemaps, palettes, animation frames and sprite-sheet export.
- Generate/source base, edit in Pixelorama, export PNG/sheet, record version/palette/frame tags, then verify the import.
- No headless CLI claim; do not overwrite source `.pxo` files.
- Details: `docs/PIXELORAMA.md`.
