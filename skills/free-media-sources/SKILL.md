---
name: free-media-sources
description: "Commercial-safe music, SFX, and voice sources: local models plus CC0/public-domain libraries, with license and attribution rules."
category: media
---

# Free / Commercial-Safe Media Sources

Use this before searching the open web for music or sound effects. The goal is a **clear license**, not just a free download.

## Local, already installed

| Need | Tool | License | Status |
|---|---|---|---|
| Song | `local_music_generate` (ACE-Step 1.5 turbo) | **MIT** (engine and weights) | tested, 30 s in 82.8 s |
| Speech | `local_tts` (Piper, `en_US-ljspeech-high`) | Piper **MIT**; voice **public domain** (LJSpeech) | tested, 15.67 s |
| SFX | `local_sfx_generate` (procedural) | **Own code**, no third-party output license | tested, 4 s |
| Video | `local_video_generate` (Wan 2.2 5B) | Apache 2.0 | tested, 704×480/49 |
| Image | `local_image_generate` (Qwen-Image 2.1) | Apache 2.0 | tested, 20 steps |

**Do not use** the removed Stable Audio 3 path: its Community License is limited to under US$1M annual revenue plus registration/attribution. It is not in the active toolchain.

## CC0 / public-domain libraries

Use these when you need a **real recording** rather than generation.

| Source | What | License rule | Link |
|---|---|---|---|
| **Freesound** | SFX, ambience, Foley | Filter **CC0**; confirm each sound page | https://freesound.org |
| **Pixabay** | Music, SFX, video | Pixabay Content License; free commercial, check current terms | https://pixabay.com/service/license-summary/ |
| **Openverse** | Images/audio search | Filter **CC0** or **CC BY**; record attribution | https://openverse.org |
| **Wikimedia Commons** | Music/SFX/images | Per-file license; prefer CC0/public domain | https://commons.wikimedia.org |
| **Free Music Archive** | Music | Per-track CC license; avoid NC/ND | https://freemusicarchive.org |
| **Incompetech** | Cinematic/background music | CC BY; attribution required | https://incompetech.com/music/royalty-free/ |
| **FreeMusicLab** | Royalty-free music/SFX | Check its license and source attribution | https://freemusiclab.ai |
| **YouTube Audio Library** | Music/SFX | Some require attribution; check each item | https://studio.youtube.com |

## Not commercial-safe for this project

| Source/model | Why |
|---|---|
| **Stable Audio 3 Community** | Free commercial only under US$1M revenue; registration, attribution, AUP; terminates above threshold |
| **MusicGen / AudioGen** | Code is MIT, but common weights are **CC-BY-NC**; do not use for published commercial work |
| **AudioLDM / MAGNeT / similar** | Often CC-BY-NC or research-only |
| **“Free” music sites with no license page** | Treat as unknown; do not publish |
| **YouTube/Spotify rips** | Never |

## Required record for every downloaded asset

Save this beside the file or in the project notes:

```text
title:
creator:
source URL:
license:
license URL:
attribution required: yes/no
attribution text:
downloaded:
sha256:
```

## Workflow for the agent

1. Prefer **local generation** for original music/SFX/TTS.
2. If a real recording is needed, search a CC0/public-domain source first.
3. Open the **individual asset page**, not just the search result.
4. Copy the license and attribution text into the record.
5. If the license is NC, ND, “unknown”, or requires a paid plan for commercial use — **stop** and report it.
6. Never publish a track or SFX without its license record.

## Suggested prompts

- Song: `local_music_generate` with style + `[verse]` / `[chorus]` lyrics, `seconds=30`.
- SFX: `local_sfx_generate` with `prompt` and `seconds` 1–8.
- Speech: `local_tts` with exact text and `voice="en_US-ljspeech-high"`.

## Rule of thumb

**Generated locally + permissive weights = safest.**
**Downloaded asset + explicit CC0/public-domain license = safe.**
**“Free” without a license = not safe.**
