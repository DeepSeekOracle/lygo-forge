# Bulk-pulling the CC0 game-asset libraries

Verified commands and measured counts. Run the whole thing before the game design is written: what the free
library actually contains decides which game is cheap to build.

## Kenney — one command gets the bulk of it

The organised mirror repo re-exports Kenney's library as clean per-kit folders with the textures they
reference, plus machine-readable indexes. Sparse-clone so only what you need lands:

```
git clone --depth 1 --filter=blob:none --sparse https://github.com/shorepine/kenney "<libdir>/kenney-mirror"
cd "<libdir>/kenney-mirror"
git sparse-checkout set 3d ui icons
```

Measured: **4,812 glTF models across 49 kits, 4,686 UI elements, 7,508 icons — 17,139 files, 208 MB**,
plus `3d/kits.tsv` (slug, title, model count) and `index.tsv` (one row per image: path, description, WxH,
bytes). Takes a few minutes; it outlives the terminal call, so background it and poll the directory.

**Not in this mirror: audio and fonts.** Those need Kenney's own packs (below) or another CC0 source
(Freesound, Sonniss, OpenGameArt).

### Reading `3d/kits.tsv` instead of guessing folder names

Authoritative index of the 3D kits. A vehicle/racing game can use `racing` (112), `toy-car` (157), `car`
(50), `road` (294), `city-roads` (72), `city-commercial` (41), `city-industrial` (25), `city-suburban`
(40), `modular-buildings` (108), `building` (79), `nature` (329), `factory` (143), `watercraft` (46),
`space` (153), `modular-space` (40) — roughly **1,300 models in one coherent art style**, which is the
reason to source one author rather than many.

## kenney.nl itself cannot be enumerated by script

No sitemap (`/sitemap.xml` returns the site's error page), and the asset index and pack pages are
JS-rendered, so `curl` of `kenney.nl/assets` or a pack page returns **zero** asset links. Therefore:

- enumerate through the mirror, not the site;
- to fetch **one specific pack** (typically audio), use a fetch that renders the page — the direct zip URL
  sits behind the pack page's "continue without donating…" link and has the shape
  `https://kenney.nl/media/pages/assets/<slug>/<hash>-<timestamp>/kenney_<slug>[_version].zip`.

## Quaternius — downloads are public Google Drive folders

His pack index is fetchable (`quaternius.com/index.html` lists ~80 `packs/<name>.html` pages) but the pack
pages carry no direct file link: the Download button opens a Google Drive folder. Scrape the folder id off
the page, then pull with `gdown`:

```
python -m pip install --quiet gdown
# id = the <id> from drive.google.com/drive/folders/<id> on the pack page
python -m gdown --folder -O "<name>" "https://drive.google.com/drive/folders/<id>"
```

Each pack extracts into `Blends/ FBX/ OBJ/` — FBX is what a Unity project wants. Not every pack page uses
the Drive pattern (some fall back to an itch.io link and yield no id), so scrape and report which ones
resolved.

Vehicle/environment packs that resolve, useful for a racer or city game: `cars`, `publictransport`,
`modularstreets`, `simplebuildings`, `ultimatetexturedbuildings`, `simplenature`, `ultimatenature`,
`stylizedtree`.

## Other CC0 sources worth knowing

- **racoon media "3D RACING ASSETS v2"** — explicitly CC0 vehicle models; it is what the free Asset Store
  Racing Starter Kit uses for its cars, so the art can be used without inheriting that kit's code EULA.
- **Kenney's Starter Kits (Match-3, Racing, 3D Platformer, FPS, City Builder) are Godot projects**, not
  Unity — his *assets* import anywhere, his *kits* do not.

## After the pull

- Import only the kits the levels call for; keep the library outside the project.
- The mirror ships **glTF-binary (`.glb`)**, so the engine project needs a glTF importer before those models
  can be placed. FBX packs import natively.
- Count per category on disk and record the numbers in the handoff notes.
