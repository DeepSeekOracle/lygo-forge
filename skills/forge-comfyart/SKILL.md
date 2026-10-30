# FORGE COMFYART

Local, ComfyUI-native design canvas: artboards, vectors, layers, rich text, mockups,
image/video/audio/3D generation and an optional MCP design agent.

## Installed

```text
ComfyUI:  <VIDEO>\ComfyUI
Node:     <VIDEO>\ComfyUI\custom_nodes\ComfyArt
URL:      http://127.0.0.1:8188/comfyart/
Licence:  ComfyArt MIT
Canvas:   tldraw SDK, separate licence (development mode on localhost)
```

Verified:

```text
GET /comfyart/ → HTTP 200
Rendered canvas → “What do you want to design?” + skills + project UI
```

Generation workflows and OCR were **not** exercised in this intake; only the canvas shell was
verified. Run one local workflow and one OCR/Edit Elements pass before claiming those features.

No Comfy Cloud key is configured. Nothing is uploaded.

## Install notes

- Clone into `ComfyUI/custom_nodes/ComfyArt`.
- `requirements.txt`: `pypdfium2`, `rapidocr`.
- A normal pip install tried to replace the locked `cv2.pyd` in ComfyUI’s venv and failed.
  Workaround used:
  - `pip install --no-deps rapidocr`
  - `pip install omegaconf colorlog`
  - keep the existing ComfyUI `cv2` (5.0.0); do **not** let pip overwrite `opencv-python-headless`.
- Restart ComfyUI after install.
- Built `dist/` is included; no npm build required for normal use.

## Forge use

Use ComfyArt when the job needs:

- a poster, social asset, banner, character sheet, thumbnail or brand board
- an editable artboard with vector/text/layers instead of one flat generation
- OCR-based “Edit Elements” to break a flat image into editable layers
- a product mockup or presentation export (PNG/JPG/PDF/PPTX)
- image/video/audio/3D generation in the same canvas as the layout

## Guardrails

- **Local only.** Do not set `COMFY_API_KEY` or use Comfy Cloud without explicit approval.
- **tldraw licence:** the canvas is bundled under the tldraw SDK licence. Localhost runs in
  development mode with a badge; production/commercial use needs its own licence review.
- ComfyArt does not install the generation models. Workflows need local Qwen/Wan/Ming or other
  installed ComfyUI models; do not claim a model works until its workflow runs.
- The Agent backend is optional; keep MCP/Agent off unless needed. It can call Claude/Codex/DSH/local
  LLM; Forge does not need it for basic layout.
- Export a real PDF/PNG and inspect it; a canvas preview is not a final asset.
- Record project path, export path, model workflow and licence in the Asset Pointer.
- Do not use third-party logos/photos without rights.

## Acceptance

- page loads without fatal console errors
- artboard dimensions and text are editable
- export opens correctly
- generated assets use a local workflow that actually ran
- tldraw/ComfyArt licences noted
- no cloud key or upload
