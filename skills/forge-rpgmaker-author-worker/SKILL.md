# FORGE RPG MAKER AUTHOR WORKER

## Scope

Author a minimal, structurally valid RPG Maker MV map event in a **disposable project copy**.
Never write to an installed project, a game project or a project without a backup.

## Mandatory gates

1. The project must be an explicit sandbox under `<PROJECTS>`.
2. Back up the target map to `data/_forge_backups/Map001.<timestamp>.json`.
3. Write atomically through a temporary file.
4. Re-parse the written map.
5. Record map hash, event id, event count and backup path.
6. Keep a rollback path.

## Event contract

- place a new event at a free event slot
- one page
- Show Text command (`101`, `401`) and end (`0`)
- action-button trigger
- no plugins, no project-wide data edits
- no engine runtime claim until the project is opened and tested in RPG Maker MV

## Acceptance

- backup exists
- JSON parses
- event id/name present
- command list ends with code 0
- map hash changes
- rollback restores the prior hash
