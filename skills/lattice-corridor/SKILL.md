---
name: lattice-corridor
description: Build, modify and publish Lattice Corridor (https://excavationpro.ca/games/lattice-corridor/). Use when touching this game, its assets, its Forge project, or when a fix 'won't go live'. Carries the live/local paths, the engineering index and the publish rules.
---

# Lattice Corridor

Engine: **web** (PrBoom) · Genre: action, fps

| | |
|---|---|
| LIVE | https://excavationpro.ca/games/lattice-corridor/ |
| Repo | `D:\excavationpro-ca\games\lattice-corridor` |
| Forge project | `<PROJECTS>\lattice-corridor` |
| Preview | http://127.0.0.1:8796/preview/lattice-corridor/ |
| Board | Forge → Schematic (`docs/ENGINEERING.txt`) |

## Rules

1. **The repo checkout is the source of truth** for the live copy. Mirrors in
   `D:\chatagent\games` and `D:\eternalhaven\games` are other repos — never copy from them,
   never publish from them.
2. Build in `<PROJECTS>\lattice-corridor\site`, verify in the preview, then copy back to the repo and push.
3. Refresh the engineering index after structural changes:
   `python onboard_game.py --slug lattice-corridor` (idempotent).
4. Never push without Justin's yes.

## Find anything

`docs\ENGINEERING.txt` in the project lists files by kind, scripts by size, asset folders, page
references and version hashes. Read it before grepping.
