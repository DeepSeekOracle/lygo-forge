---
name: lattice-crypt
description: Build, modify and publish Lattice Crypt (https://excavationpro.ca/games/lattice-crypt/). Use when touching this game, its assets, its Forge project, or when a fix 'won't go live'. Carries the live/local paths, the engineering index and the publish rules.
---

# Lattice Crypt

Engine: **web** (static page) · Genre: action, co-op, dungeon

| | |
|---|---|
| LIVE | https://excavationpro.ca/games/lattice-crypt/ |
| Repo | `D:\excavationpro-ca\games\lattice-crypt` |
| Forge project | `<PROJECTS>\lattice-crypt` |
| Preview | http://127.0.0.1:8796/preview/lattice-crypt/ |
| Board | Forge → Schematic (`docs/ENGINEERING.txt`) |

## Rules

1. **The repo checkout is the source of truth** for the live copy. Mirrors in
   `D:\chatagent\games` and `D:\eternalhaven\games` are other repos — never copy from them,
   never publish from them.
2. Build in `<PROJECTS>\lattice-crypt\site`, verify in the preview, then copy back to the repo and push.
3. Refresh the engineering index after structural changes:
   `python onboard_game.py --slug lattice-crypt` (idempotent).
4. Never push without Justin's yes.

## Find anything

`docs\ENGINEERING.txt` in the project lists files by kind, scripts by size, asset folders, page
references and version hashes. Read it before grepping.
