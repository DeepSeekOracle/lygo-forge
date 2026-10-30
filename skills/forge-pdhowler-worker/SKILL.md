# FORGE PD HOWLER WORKER

## Scope

Use the installed PD Howler 11 ImageMagick `convert.exe` for deterministic image conversion,
resizing, channel/color-space conversion and simple generated test plates. PD Howler painting is
GUI-only; do not claim painting automation.

## Rules

- Work only inside the assigned project `assets/working/` or `assets/engine/` folders.
- Preserve the source; write a new output filename.
- No opaque downloads unless an Asset Pointer record exists.
- Record command, input hash, output hash, dimensions and byte size.
- Do not use this adapter to fake painted art.

## Acceptance

- output opens
- dimensions and color space match the spec
- source retained
- command and hashes recorded
- no out-of-scope file changes
