---
name: lygo-dungeon
description: Build, modify and publish LYGO Dungeon Adventures (https://excavationpro.ca/games/lygo-dungeon/). Use when touching this game, its assets, its Forge project, or when a fix 'won't go live'. Carries the live/local paths, the engineering index and the publish rules.
---

# LYGO Dungeon Adventures

Engine: **unity** (Unity WebGL) · Genre: dungeon, rpg

| | |
|---|---|
| LIVE | https://excavationpro.ca/games/lygo-dungeon/ |
| Repo | `D:\excavationpro-ca\games\lygo-dungeon` |
| Forge project | `<PROJECTS>\lygo-dungeon` |
| Preview | http://127.0.0.1:8796/preview/lygo-dungeon/ |
| Board | Forge → Schematic (`docs/ENGINEERING.txt`) |

## Rules

1. **The repo checkout is the source of truth** for the live copy. Mirrors in
   `D:\chatagent\games` and `D:\eternalhaven\games` are other repos — never copy from them,
   never publish from them.
2. Build in `<PROJECTS>\lygo-dungeon\site`, verify in the preview, then copy back to the repo and push.
3. Refresh the engineering index after structural changes:
   `python onboard_game.py --slug lygo-dungeon` (idempotent).
4. Never push without Justin's yes.

## Find anything

`docs\ENGINEERING.txt` in the project lists files by kind, scripts by size, asset folders, page
references and version hashes. Read it before grepping.
