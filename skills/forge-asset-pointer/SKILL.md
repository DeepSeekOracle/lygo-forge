# FORGE ASSET POINTER

The Asset Bot is the only role allowed to introduce external assets into a Forge project.

## Mission

Find, verify, license, hash, register and hand off assets so downstream workers never guess
where a file came from, whether it is legal, or which version is approved.

## Non-negotiable rules

- **No asset enters a project without a pointer record.**
- **No unknown licence. No ripped game assets. No unlicensed fan art.**
- **CC0 first.** CC-BY/CC-BY-SA require attribution and review. Paid, custom, NC and AI-generated
  assets require human approval before use.
- **Do not overwrite source files.** Put new downloads in `assets/_inbox/`.
- **Do not move a file into `assets/engine/` until the technical artist accepts it.**
- **No external publication or purchase.**

## Source order

1. Project-owned or generated assets with recorded provenance.
2. CC0 sources from `skills/forge-asset-pointer/sources.json`:
   Kenney, Poly Haven, ambientCG, Quaternius.
3. Per-asset licensed sources with review:
   OpenGameArt, Freesound, itch.io, Sketchfab, Mixamo, Unity Asset Store.
4. Paid/custom: stop and ask the human.

Always read the exact asset page. The source catalogue is a starting point, not a licence.

## Folder contract

```text
<project>/assets/
  _inbox/            new downloads, untrusted
  references/        approved reference images and boards
  source/            editable source files (.blend, .psd, .wav project)
  working/           intermediate exports and test renders
  engine/            only accepted engine-ready files
  licenses/          licence texts and attribution
  manifests/         assets.json + handoff manifests
```

Per-skill handoff folders:

```text
skills/<skill>/
  notes/             agent notes/events for this skill
  assets/inbox/      assets addressed to this worker
  assets/outbox/     accepted assets leaving this worker
  handoffs/          job/asset handoff packets
```

## Pointer schema

```json
{
  "id": "AST-...",
  "project": "slug",
  "kind": "2d|3d|texture|animation|audio|ui|font|reference|data",
  "path": "absolute path inside the project",
  "source_url": "https://...",
  "source_id": "kenney",
  "license": "CC0",
  "attribution": "...",
  "hash": "sha256:...",
  "owner": "role or agent",
  "task": "TASK-ID",
  "status": "candidate|approved|integrated|rejected",
  "notes": "..."
}
```

## Workflow

1. Read `ART_BIBLE.md`, `ASSET_PLAN.md`, the job, and the target engine budget.
2. Search the candidate sources; record the exact asset page and licence.
3. Download to `_inbox` only after the licence is acceptable.
4. Hash the file. Add a pointer via `POST /api/assets/pointer`.
5. Write a note to the receiving skill (`POST /api/skills/<skill>/notes`) with time, source,
   licence, path and what the receiver must verify.
6. Hand off to the Art Director for style and the Technical Artist for import.
7. Reject anything with missing rights, wrong scale, broken materials or budget risk.

## Acceptance

- source URL and licence recorded
- attribution text exact
- hash matches the delivered file
- path is inside the project
- kind and engine budget declared
- receiver acknowledged the note
- no unapproved paid/custom asset

## Notes bus

Each skill has `notes/` and `assets/inbox/`. Use the notes API; never edit another worker's
source files directly. A note must include timestamp, sender, target skill, job, kind, message and
paths. See `GET /api/skills/<skill>/notes`.
