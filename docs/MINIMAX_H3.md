# MiniMax H3 Director — Forge note

**Source:** https://x.com/bkdgiffug/status/2111972093286133877  
**Repo:** https://github.com/huangserva/ComfyUI_MiniMaxH3_Director  
**Upstream:** https://github.com/AIMixer/ComfyUI_MiniMaxH3_Director  
**Licence:** Apache-2.0 (workflows/plugin); model weights have their own terms  
**Decision:** **NOT VIABLE on this host. No install.**

## Why

The verified environment is:

```text
NVIDIA RTX 4090 48 GB
ComfyUI 0.30.0
PyTorch 2.11 + CUDA 12.8
MiniMax H3 Ref2VA INT8
```

Required components include:

```text
minimax_h3_fl2va_pruned_int8_convrot.safetensors
minimax_h3_ref2va_pruned_int8_convrot.safetensors
qwen3vl_32b_minimax_h3_nvfp4_awq.safetensors
minimax_h3_video_vae_fp16.safetensors
minimax_h3_audio_vae_fp32.safetensors
```

A 32B text encoder plus H3 video weights cannot run on an **8 GB RTX 4060 Ti** at usable speed. Forge
already has a working Wan 2.2 5B path at 704×480 / 97 frames.

## If the host changes

- Re-check the upstream workflow and model licences.
- Use a separate ComfyUI install/container; do not disturb the Wan environment.
- Start with one 5-second shot; measure VRAM, time and quality.
- H3 identity consistency is model/reference-bound; no hard identity lock.
- Do not install until the GPU has enough VRAM for the 32B text encoder plus video weights.

## Pointers

- https://github.com/huangserva/ComfyUI_MiniMaxH3_Director
- https://github.com/AIMixer/ComfyUI_MiniMaxH3_Director
- https://huggingface.co/Comfy-Org/MiniMax-H3
- Existing Forge path: Wan 2.2 5B at 8188
