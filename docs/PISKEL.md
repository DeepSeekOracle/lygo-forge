# Piskel — pixel-art editor, vendored

**Source:** https://x.com/songsong/status/2115251310237012067 (2026-10-27) →
https://github.com/piskelapp/piskel
**Licence:** Apache-2.0
**Vendored at:** `<FORGE_DIR>\tools\piskel` — `gh-pages` branch, commit **f8c61cf**,
838 files / 18.4 MB. The prebuilt static app, not a source build (the repo's `master` needs
Vite + a sprite step; the published build is what users actually run).
**Served at:** `http://127.0.0.1:8796/pixel/` — route `pixel_editor()` in `server.py`, `no-store`.
**UI:** `Pixel` button in the Forge header; also linked from the Assets panel.

## What it does that the asset pipeline needed

| Need | Piskel |
|---|---|
| zone/service icons at 24px | 32×32 canvas, palette, layers |
| character walk frames | multi-frame timeline + FPS + onion skin, preview in-place |
| item / UI sprites | PNG, PNG sheet, animated GIF export |
| a source file an agent can read back | `.piskel` (JSON) export |

All exports are **commercially usable** — Apache-2.0 for the editor; the art is yours.

## The wiring (this is what "installed" means here)

1. **Runs locally, offline.** No piskelapp.com call, no version drift: the exact editor that made an
   asset is in the repo.
2. **A path into the project.** Piskel only downloads files, so the Forge now accepts them:
   `POST /api/projects/<slug>/assets/upload` (multipart) → writes to `assets/_inbox/` and appends to
   `assets/manifests/assets.json` as `candidate`, with `{path, kind, source, license, attribution,
   sha256, bytes, owner, task, status}`.
3. **Assets panel control.** *MADE IT LOCALLY? → Open the pixel editor* … *IMPORT FILE* … *Import &
   register*. Verified 2026-10-28: 16×16 PNG → `assets/_inbox/sprite-test.png`, 129 bytes,
   `sha 212f195ce646`, manifest entry created, HTTP 201.
4. **Not auto-imported.** As with every other asset, it stays a `candidate` until the art director /
   technical artist accepts it. The editor cannot bypass the licence gate.

## Verified state, 2026-10-28

```
GET /pixel/                 -> 200, 52,308 bytes
Playwright load             -> title "Piskel", 6 canvases (96x96 sprite + 915x850 layers),
                               37 toolbars, 0 failed requests, 0 console errors
POST .../assets/upload      -> 201, file on disk, manifest entry #5
```

## Limits worth knowing

- The editor is per-tab; there is no "save back to this project" button (no API upstream). The import
  step is the bridge.
- No sprite-sheet slicing on import: Piskel's sheet export and the game's loader must agree on the
  grid, so record the grid in the manifest entry (`kind: "png-sheet"`, note the cell size).
- 20 MB cap on import (the shared asset limit).
