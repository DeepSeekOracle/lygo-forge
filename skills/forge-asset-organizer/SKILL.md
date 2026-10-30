---
name: forge-asset-organizer
description: Find, place and catalogue game assets in the LYGO Forge. Use BEFORE creating any asset folder, whenever an agent needs art, audio, 3D or fonts for a game, when adding new assets, or when the catalogue looks stale. Points at the asset vault (<ASSETS>), the Forge Assets registry and the per-game engineering indexes, and defines the naming/ownership rules that keep 18 games from scattering art across the drives again.
---

# Forge asset organizer

**Search the catalogue before you create a single folder.** Agents have already stashed game art in
dozens of places; the whole point of this skill is that you never guess where anything is.

## The vault

```
<ASSETS>\
    index.json          per-game pooled assets: folders, counts, bytes, digest, junction status
    discovered.json     every asset-bearing folder on every drive, with attribution + why it matched
    REPORT.md           human summary: by drive, by game, biggest folders, unattributed over 50 MB
    by-game\<slug>\     junction -> that game's project site/ (live, never a copy)
    shared\             genuinely reusable packs (UI kits, sfx, fonts, textures)
```

| File | Read it when |
|---|---|
| `REPORT.md` | first look — "what art do we have and where" |
| `index.json` | you need exact counts/bytes per game or a folder list |
| `discovered.json` | the catalogue is missing something and you must hunt raw |

The Forge **Assets tab** (`Assets → Asset folders`, `GET /api/assets/folders`) is the live registry —
same data, filterable, with a *Scan drives* button.

## Three ways to find an asset

**1. By game (normal case).** Everything a game ships lives in its project:

```
<PROJECTS>\<slug>\site\        the live build (this IS the game's asset tree)
<PROJECTS>\<slug>\docs\ENGINEERING.txt   files by kind, asset folders, scripts, versions
```

**2. By catalogue.** Grep the index instead of the disk:

```powershell
python -c "import json;d=json.load(open(r'<ASSETS>\index.json'));[print(g,v['files'],v['bytes'],v['kinds']) for g,v in d['games'].items()]"
Select-String -Path <ASSETS>\REPORT.md -Pattern 'tile|sprite|font'
```

**3. By tile key (canvas games).** When you know the *sprite* but not the file:
`python tools\map_game.py --grep windmill` in the `lattice-city` skill — it maps key → files → theme.

## Rules (non-negotiable)

1. **One physical copy.** Per-game art lives under that project's `site/`. The pool junctions it.
   Never copy a game's assets into `shared/` "to be safe".
2. **`shared/` is for genuine reuse only** — a font, an SFX pack, a UI kit used by 2+ games.
   If it belongs to one game, it belongs to that game.
3. **Register anything new** so the next agent finds it:
   `POST /api/assets/folders {"project":"<slug>","path":"...","kind":"image"}`.
4. **Never treat a mirror as a source.** `D:\chatagent\games\*`, `D:\eternalhaven\games\*` are copies
   inside other repos. Index them, never copy from them, never publish to them.
5. **No orphan art.** A PNG in a build that nothing references is a bug — `docs/ENGINEERING.txt`
   flags them as `(not referenced in code)`.
6. **Attribution is evidence, not vibes.** `discovered.json` records *why* a folder matched a game
   (slug in path, token in folder name). If it says unattributed, it stays unattributed until someone
   claims it — do not rename a folder just to make it match.

## Adding an asset (the loop)

1. Check the catalogue — does it already exist somewhere? (Usually yes.)
2. Put it in the **owning game's** asset tree: `<PROJECTS>\<slug>\site\assets\...`
3. Add the manifest/key wiring if the engine needs it (see that game's skill / engineering index).
4. Register the folder (rule 3), then refresh the pool:

```powershell
python tools\pool_assets.py        # rebuild by-game junctions + index.json
python tools\sweep_assets.py       # full-drive rescan -> discovered.json + REPORT.md  (slow, ~15 min)
```

5. Append one line to that project's Schematic ledger so the change is traceable.

## Sizing and speed

- `pool_assets.py` is fast (reads project folders only) — run it whenever assets change.
- `sweep_assets.py` walks **every drive at unlimited depth** and takes ~15 minutes. Run it in the
  background, never in a blocking step. It is read-only and safe to re-run.
- Models (`.gguf`), emulator vaults and node_modules are not game assets; if a folder shows up in
  `discovered.json` and it is 90 % models, ignore it.

## Current numbers (2026-10-26)

- Pooled per game: **18/18** junctions, 2,096 asset files, 311 MB, one `index.json`.
- Per game in the pool: haven-desk 736 files/67 MB · lattice-crypt 267/26 MB · lattice-arena 180/73 MB ·
  fish-tank 159/46 MB · moonlit-tactics 102/36 MB · lattice-city 399/2.4 MB.
- Full-drive sweep: see `REPORT.md` — that is the authority for what exists *outside* the projects.

## What this skill is not

Not a licence tracker (use the Forge asset pointers, which carry source + licence + hash), and not a
mover — nothing in this workflow relocates existing folders. Organisation happens by **indexing and
owning**, not by dragging files around.
