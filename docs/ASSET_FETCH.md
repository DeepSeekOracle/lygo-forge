# Forge Asset Fetch Contract

The Asset Bot is the only role allowed to fetch external assets.

## Allowlist

Only HTTPS URLs whose host is listed for the selected `source_id` can be fetched.
The host is re-checked after redirects. No arbitrary URL fetching.

## Size and types

- Maximum **20 MB**.
- Allowed suffixes: `.png .jpg .jpeg .webp .gif .wav .ogg .mp3 .glb .gltf .fbx .blend .txt .md .json`.
- Image suffixes must return an `image/*` content type.
- No executables, scripts, or unknown binaries.

## Licence gate

- **CC0** — automatic.
- **CC-BY / CC-BY-SA / per-asset / custom** — requires `approve_restricted=true` plus licence and attribution.
- Paid/NC/custom assets still require a human decision before integration.

## Destination

Every download goes to:

```text
<project>/assets/_inbox/
```

It is **not** imported into the engine. The Asset Pointer records:

- source URL and source id
- licence and attribution
- SHA-256
- path, owner, task
- status `candidate`

The receiving skill gets a timestamped note. The Art Director and Technical Artist must accept it
before it moves to `assets/engine/`.

## API

```text
POST /api/assets/fetch
{
  "project": "forge-gauntlet-sandbox",
  "source_id": "kenney",
  "url": "https://kenney.nl/...",
  "license": "CC0",
  "attribution": "Kenney",
  "owner": "asset-bot",
  "task": "ASSET-01",
  "kind": "reference",
  "to": "forge-image-worker",
  "approve_restricted": false
}
```

## Verified test

Real CC0 fetch:

```text
source: Kenney UI Pack preview
bytes: 28,908
license: CC0
pointer: AST-20261022-9955db4f
hash: sha256:41bcfd35…7f561
destination: <PROJECTS>\forge-gauntlet-sandbox\assets\_inbox\preview.png
note: forge-image-worker/notes/2026-10-22/
```

Rejected:

- non-allowlisted host → 400
- restricted licence without approval → 400
- remote fetch failure → 400 `download failed: HTTP 404`
- unsupported `.exe` suffix → 400

No file is written on a rejected request.

## Restricted licence approval flow (2026-10-22)

Restricted assets no longer download on a boolean flag.

1. `POST /api/assets/fetch` with a non-CC0 source creates an **approval** note in `forge-master`
   and returns **202** with no file written.
2. The approval note stores the exact project, URL, source, licence, attribution, owner, task and target.
3. `POST /api/skills/forge-master/notes/<id>/resolve` with `approved` validates the request and
   auto-fetches it; a rejection never downloads.
4. The Asset Pointer is registered and the target skill gets a new asset note.

Verified with OpenGameArt CC-BY-SA 3.0:

```text
Request:   202, NOTE-20261022-092243-57d839, no download
Approval:  Justin
Asset:     AST-20261022-df50bf43
Bytes:     293.6 KB class
Hash:      sha256:b1ce2a11…a9697
Path:      ...\forge-gauntlet-sandbox\assets\_inbox\wood_tileset_3.png
Pending:   0 after resolution
```

Attribution: Jetrel, Daniel Cook, Bertram, Zabin.
