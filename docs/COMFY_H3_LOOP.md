# ComfyUI MiniMax H3 Loop — Forge pointer

**Source:** https://x.com/aiaicreate/status/2113237150011621747  
**Repo:** https://github.com/pxl-pshr/ComfyUI-MiniMaxH3-Loop  
**License:** **GPL-3.0**  
**Decision:** **POINTER ONLY. Not installed or bundled into Forge.**

## What it does

A ComfyUI custom node for **seamless MiniMax H3 video loops**:

- wraps the latent’s end around to its start during sampling
- no crossfade, first/last-frame anchor, or second pass
- loop-aware audio sampling (`views` 2)
- loop decode with wrapped context
- loop frame interpolation (FILM/RIFE)
- ControlNet restyling of an existing seamless loop
- MiniMax H3 Loop Control Video for 3D/depth loops

## Why Forge does not install it

- **GPL-3.0** code; do not copy it into Forge’s source or bundle it into the exe.
- Requires **MiniMax H3** diffusion model, text encoder, video/audio VAEs and optional LoRA/ControlNet.
- Workflow render time is about **21 minutes per loop on an RTX 4090** at 1280×704; defaults are 1344×768, 6.4 s.
- This Forge host has an **8 GB RTX 4060 Ti**; H3 loop feasibility there is not established.
- Forge’s current ComfyUI path is Wan 2.2 for short video; the H3 loop pack is a separate H3 workflow.
- It is a ComfyUI extension, not a Forge skill or asset format.

## Use as a pointer

If the operator later runs MiniMax H3 on a suitable GPU:

```bash
cd ComfyUI/custom_nodes
git clone https://github.com/pxl-pshr/ComfyUI-MiniMaxH3-Loop
```

Requirements: ComfyUI v0.42.0+, optional ComfyUI-Frame-Interpolation and VideoHelperSuite. Read the
upstream README and licence before use. Keep the extension as an external ComfyUI install; do not
copy its code into Forge.

## Free/paid status

- Extension code: GPL-3.0, free.
- H3 model files: check each Hugging Face card; this pointer does not claim all are free for
  commercial use.
- No paid API is used by the extension itself.

## Forge relationship

- Forge video work remains on its existing ComfyUI/Wan path.
- No Forge skill, workflow or exe includes this GPL code.
- This document is a research pointer only.
