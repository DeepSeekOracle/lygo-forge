# MOSS-Image — Forge experimental pointer

**Source:** https://x.com/ai_hakase_/status/2112848124641165418  
**Official:** https://github.com/OpenMOSS/MOSS-Image  
**Weights:** https://huggingface.co/OpenMOSS-Team/MOSS-Image-Base  
**Licence:** Apache-2.0  
**Decision:** **POINTER ONLY. No model or ComfyUI nightly installed.**

## Why it matters

MOSS-Image is unusually good at **text inside images** and **layout control**:

- accurate spelling/replacement for signs and UI mockups
- JSON bounding-box layout with text and object placement
- long prompts up to 4K tokens
- anime and photoreal styles
- image editing via references (community nodes)
- SeedVR2 upscale in the community workflow

That is directly useful for game UI boards, signage, posters and in-world text.

## Why not installed now

- It is a **5B diffusion model** plus a **Qwen3.5-9B text encoder** and FLUX VAE; large for an 8 GB card.
- The community 8 GB workflow relies on offloading/quantization; official memory modes include sequential/fallback.
- Native ComfyUI support requires **master/nightly commit `e087d8f6` or later**; the current stable `v0.41.3` lacks it.
- Forge’s current ComfyUI path is a working **Wan 2.2** video workflow; upgrading to nightly risks breaking it.
- The community workflow needs AusBoss nodes; source/licence and compatibility need review.
- The official demo/Spaces are a safer first test.

## If adopted later

1. Snapshot the working ComfyUI/Wan environment first.
2. Use a separate ComfyUI install or container for MOSS-Image.
3. Start with the official ComfyUI-format weights, not the plugin workflow.
4. Test at low resolution on the 8 GB card; record VRAM and step time.
5. Verify text spelling and layout JSON against a fixed test sheet.
6. Keep the model outside the Forge exe; it is a ComfyUI model, not a Forge runtime.
7. Add a Forge image-worker capability only after a successful local render.

## Free access

- HF weights: https://huggingface.co/OpenMOSS-Team/MOSS-Image-Base
- HF SFT: https://huggingface.co/OpenMOSS-Team/MOSS-Image-SFT
- ComfyUI weights: https://huggingface.co/Comfy-Org/MOSS-Image
- Demo: https://huggingface.co/spaces/OpenMOSS-Team/MOSS-Image
- No paid API required for the open weights.

## Edit-LoRA node (2026-10-23 follow-up)

`ComfyUI-MOSS-Image-Ostris-Edit` adds reference-image latent conditioning for an ai-toolkit MOSS-Image
edit LoRA. It requires the **native MOSS-Image ComfyUI stack**, Qwen3.5 vision weights and the LoRA. Forge
has none of that installed, and the base 5B + 9B stack is already too heavy for this 8 GB card. **Disregard
for now**; it is only useful after a working MOSS-Image install.

## Forge handoff

Do not claim MOSS-Image is installed. For a text-in-image job, use the existing local image worker or the HF Space, and record which model actually produced the asset.
