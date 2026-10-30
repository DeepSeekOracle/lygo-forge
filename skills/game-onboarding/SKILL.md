---
name: game-onboarding
description: Onboard or maintain any excavationpro.ca game in the LYGO Forge — pull its LIVE copy, install a project with site/docs/assets, find its original build folder, index the assets, generate the engineering index and a per-game skill, and lock local==LIVE parity with ship stamps. Use when adding a game to the Forge, syncing a game repo, refreshing an engineering index, or when an agent needs to know where a game actually lives.
---

# Game onboarding — 18 titles in the Forge

One pipeline, run per game. Built 2026-10-26; all 18 live titles onboarded that day.

## Layout (fixed)

```
<PROJECTS>\<slug>\        Forge project == working dir
    site\                       LIVE copy; the preview serves it (server prefers site/index.html)
    docs\                       ENGINEERING.txt, GAME.md, SOURCES.md, VERSIONS.json, SHIP-STAMPS.jsonl
    GDD.md ART_BIBLE.md PLAN.md QA.md   seeded per game, the Forge tab content
<ASSETS>\
    index.json                  master asset index (every game, counts, bytes, digest)
    by-game\<slug>\             junction -> that project's site/  (no duplication)
    shared\                     genuinely reusable packs (curated by hand)
```

Repo of record: `D:\excavationpro-ca`, game at `games/<slug>`.
Registry: `<FORGE_DIR>\data\games.json` (18 entries + excluded false positives).

## Tools

| Tool | Run | Does |
|---|---|---|
| `onboard_game.py` | `--slug <slug>` or `--all` | project → live copy → hashes + LIVE parity → engineering index → seeded tabs → skill → asset registry → ledger |
| `pool_assets.py` | no args | junctions every game into the pool + rewrites `index.json` |
| `stamp_games.py` | no args | baseline **candidate** ship stamp per game (idempotent) |
| `normalize_projects.py` | no args, **Forge stopped** | forces project key == slug and path under `<PROJECTS>` |

All idempotent. Re-run freely.

## Hard rules (learned the hard way)

1. **Never write outside `<PROJECTS>`.** A stale registry entry once pointed at
   `<USER>\source\chatagent\games\haven-desk`; the template pruner deleted that repo's
   `index.html` and overwrote four tracked docs. `onboard_game.py` now refuses and exits. Keep it.
2. **The repo checkout is the only source of truth.** `D:\chatagent\games\*` and
   `D:\eternalhaven\games\*` are copies inside *other repos* — hash and index them, never copy from
   or publish to them.
3. **Normalise line endings before hashing.** CRLF checkout vs LF blob on Pages makes every file
   look changed (`_lf` in the tooling).
4. **Don't derive the project slug from the title.** "LYGO Dungeon Adventures" produced
   `lygo-dungeon-adventures`; "Vale Tactics" produced `vale-tactics`. Slug must equal the game slug.
   `normalize_projects.py` fixes drift and re-homes anything that escaped the root.
5. **Unity games are two artefacts:** WebGL build in `site/`, Unity project path in `docs/SOURCES.md`.
   Never claim the build *is* the source.
6. **Third-party engines need licence care:** `lattice-corridor` is PrBoom/WASM — read `SOURCE.md`
   before reusing anything from it.

## Runbook — a new game

1. Add the entry to `data/games.json` (slug, title, genre, engine, sources, mirrors).
2. `python onboard_game.py --slug <slug>` → check `live_match=True`.
3. `python pool_assets.py` → the game appears in `<ASSETS>\by-game\`.
4. `python stamp_games.py` → candidate stamp.
5. Open the Forge preview `http://127.0.0.1:8796/preview/<slug>/`, then use the git bar
   (Pull / Sync / Push / Post live) instead of typing git.
6. Only after a human looks: wire `--human <name>` when making a real ship stamp.

## State as of 2026-10-26

18/18 with: `site/` + preview 200, `docs/ENGINEERING.txt`, `docs/VERSIONS.json` (`live_match: true`),
tab docs (GDD/ART_BIBLE/PLAN/QA), harness (`TASKS.json`), a per-game skill, and a candidate stamp.
Asset pool: ~2,100 asset files, ~311 MB, 18 junctions.

## When this skill is wrong

The pool `shared/` folder is empty by design — curation needs judgement. If a game's engine hints
come back empty or a script is inline-only, the engineering index is thin; add a note in that game's
`docs/ENGINEERING.txt` rather than guessing.
