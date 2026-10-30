# FORGE RPG MAKER WORKER

## Scope

Validate and inspect an RPG Maker MV project using its JSON data files. This adapter is read-only:
it does not launch the GUI, create maps, edit events or overwrite project data.

## Checks

- `data/System.json` exists and parses
- `data/Actors.json` exists and parses
- map files count
- data file count
- project path and engine identity
- no project files changed

## Rules

- Read-only unless a future job explicitly authorizes a write and the project has a backup.
- Do not edit `data/` or `js/` in this adapter.
- Report missing data, unreadable JSON and map counts as evidence.
- Asset import and map authoring are separate, gated adapters.

## Acceptance

- valid JSON and expected project structure
- exact counts and paths
- zero files changed
