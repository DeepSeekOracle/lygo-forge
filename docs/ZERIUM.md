# Zerium — Forge pointer

**Source:** https://x.com/onestep621/status/2111704317715738725  
**Site:** https://zerium.pages.dev  
**Repo:** https://github.com/1Step621/zerium  
**Licence:** GPL-3.0-or-later  
**Decision:** **POINTER ONLY. No install.**

## What it is

A cross-platform, GPU-accelerated video editor built with (W)GPUI:

- intuitive timeline/items/effects
- GPU preview/render
- plugin system
- reusable scenes
- Windows/macOS/Linux
- free/open source

## Why Forge does not install it

- The author labels it **beta**; project format can change and older projects may stop opening.
- It is a **GPL-3.0** desktop application, not a Forge worker or library.
- Forge already has HyperFrames (HTML→MP4), FFmpeg and Audio Studio for its video path.
- A GUI editor cannot be driven headlessly by the dispatcher without a CLI/API it does not yet document.

## If adopted later

- Use it on a **copy** of a project, never the only master.
- Export a rendered master plus the project file.
- Verify GPU render output on this 8 GB card.
- Check plugin licences; GPL-3.0 applies to the editor.
- Keep it outside the Forge exe.

## Forge paths today

- **HyperFrames** — code/HTML → deterministic MP4
- **FFmpeg** — encode, trim, mux
- **Audio Studio MCP** — BGM/SFX
- **Ming TTS** — voice
- **Sonicproof** — audio QA
