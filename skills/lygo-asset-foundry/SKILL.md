---
name: lygo-asset-foundry
description: "Use when an agent must produce consistent, engine-ready game art for LYGO games: character/prop cutouts, tiles, UI, sprite sheets, manifests, validation, and Unity export. Runs local Qwen-Image 2.1 through a contract-aware CLI/MCP queue. No auto-publish; no 3D claims without real 3D weights."
version: 0.1.0
license: MIT-0
metadata:
  openclaw:
    emoji: "⚒"
    homepage: "https://chatagent.ca/games/lattice-arena/"
    requires:
      anyBins: [python]
    os: [windows]
  lygo: true
  signature: "LYGO-ASSET-FOUNDRY-SKILL-v0.1.0"
---

# LYGO Asset Foundry

Use this skill instead of hand-prompting a fresh image for every frame. The Foundry
turns a **style contract** plus a subject into a canonical asset, a transparent
cutout, a validated pack, and a Unity-ready folder.

**Root:** `<DRIVE_D>\LYGO\asset-foundry`  
**Run with:** `C:\Python313\python.exe`  
**Contract:** `contracts/lattice-arena.json`

## What this system is for

- A consistent hero / creature / prop identity across poses.
- Clean transparent cutouts on a known magenta key.
- Uniform sheets with manifest coordinates (never guess cell sizes).
- Tile seams measured, not eyeballed.
- A queue that local agents can fill while the operator does something else.
- An export folder Unity can import.

It is **not** a 3D generator, a rigging system, or an auto-publisher. Do not claim
a 2D image is a 3D asset. Do not publish a pack without review.

## Workflow

1. Read the contract:

```powershell
C:\Python313\python.exe <DRIVE_D>\LYGO\asset-foundry\forge.py contract show lattice-arena
```

2. Compile the prompt and check it before spending GPU time:

```powershell
C:\Python313\python.exe <DRIVE_D>\LYGO\asset-foundry\forge.py prompt --kind hero --subject "Vale, red-armoured arena champion, notched broadsword"
```

3. Generate the **canonical** asset. Use a stable `--name` and `--seed`:

```powershell
C:\Python313\python.exe <DRIVE_D>\LYGO\asset-foundry\forge.py generate `
  --kind hero `
  --subject "Vale, red-armoured arena champion, notched broadsword, dark hair, teal arena light" `
  --pack arena-heroes --name hero_vale_canonical --seed 42
```

4. Inspect the result. If the character is good, keep both the raw PNG and the
   `_rgba.png`. If not, reject it and re-prompt; do not animate a bad base.

5. Make variants with image-to-image, never a fresh identity:

```powershell
... generate --kind hero --subject "Vale in a combat stance, same face, same armour, same sword" `
  --pack arena-heroes --name hero_vale_attack01 `
  --init-image packs\arena-heroes\raw\hero_vale_canonical_rgba.png --strength 0.45 --seed 42
```

6. Optional pixel pass for the Arena look, then validate before ingest:

```powershell
... pixelate packs\arena-heroes\raw\hero_vale_canonical_rgba.png --out packs\arena-heroes\raw\hero_vale_canonical_px.png --height 192 --colors 48
... validate packs\arena-heroes\raw\hero_vale_canonical_px.png
```

7. Ingest into Unity or the shared library:

```powershell
... ingest arena-heroes --unity-project "<DRIVE_D>\LYGO Unity Game"
```

8. Record the prompt, seed, contract, source hash, and reviewer in the pack manifest.

## Animation rule

Do **not** generate a new PNG for every animation frame. A cutout plus Unity 2D
bones/transforms is cheaper, sharper, and keeps identity. Use generated frames only
for effects where a hand-drawn sequence is genuinely needed, and then use `sheet`
with a fixed cell and manifest.

## Queue rule

Long jobs go in the queue, never in a blocking tool call:

```powershell
... queue add --kind image --args '{"subject":"Arena floor, cracked basalt with teal runes","kind":"tile","pack":"arena-arena","name":"tile_basalt"}'
... queue worker --once
```

Agents may add jobs and inspect status. A worker daemon processes one job at a time.
Do not start a second worker; the lock file refuses it.

On the 8 GB card, generation defaults to 512 px, `--max-vram 5`,
`--no-offload`, and `--params-backend diffusion=disk`. A 1024 attempt can CUDA-OOM;
that is a resource failure, not a prompt verdict.

## Quality gates

- Transparent corners on every cutout.
- Pixel pass is deterministic; do not let the model decide the palette.
- Full body inside the frame, no cropped feet/weapons.
- Sheet dimensions divisible by the declared cell.
- Tile seam mean absolute error <= 18 on both axes.
- Same palette and lighting contract across a pack.
- If the face/armour changes between variants, reject the variant.

## Safety

- Local files only; no upload, no auto-post, no auto-push.
- One GPU-heavy engine at a time. Qwen can take minutes; let the queue own it.
- Keep model and tool paths in `config/foundry.json`; do not scatter API keys or
  absolute paths through prompts.
- Generated images are RESOURCE, not CANON. A human reviewer accepts the pack.

## MCP

`C:\Python313\python.exe <DRIVE_D>\LYGO\asset-foundry\mcp_server.py` exposes:
`forge_status`, `forge_contracts`, `forge_prompt`, `forge_validate`,
`forge_queue_add`, `forge_jobs`, `forge_ingest`, `forge_generate`.
