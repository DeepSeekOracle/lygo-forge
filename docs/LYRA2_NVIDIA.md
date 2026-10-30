# NVIDIA Lyra 2.0 — Forge note

**Source:** https://x.com/_guillecasaus/status/2113603348943224839  
**Code:** https://github.com/nv-tlabs/lyra/tree/main/Lyra-2  
**Weights:** https://huggingface.co/nvidia/Lyra-2.0  
**Code licence:** Apache-2.0  
**Weights licence:** NVIDIA Internal Scientific Research and Development Model License  
**Decision:** **NOT ADOPTED. No install, no weights.**

## What it does

Turns one image into an explorable 3D world:

- generates a long camera-controlled walkthrough video
- reconstructs it into a 3D Gaussian Splatting scene (`.ply`)
- supports revisiting areas with geometry routing
- can be used for real-time rendering / Isaac Sim research

## Why not adopted

- **Weights are research-only.** The model card forbids production use, distribution,
  deployment, public display/performance and works for sale or distribution.
- **14B model based on WAN-14B**, tested on **H100 80GB**; runtime ~9 min per 80 frames,
  ~35s only with DMD.
- Linux-focused; no 8 GB path.
- The post’s “Apache 2.0” applies to the **code**, not the weights.
- Forge needs commercially shippable output; this does not qualify.
- Name collision: this is **NVIDIA Lyra 2.0**, unrelated to the LYRA stream bot.

## If used for research only

- Separate Linux/H100 environment.
- No production pipeline, no public display, no redistribution.
- Check every third-party dependency and input image licence.
- Do not put the output into a commercial game.

## Forge path today

- Blender headless for authored meshes
- glTFpack for GLB optimisation
- ThreeJS Assets free commercial tier
- Mixamo/Blender for humanoid rigs
- ComfyArt for local design/layout
- Wan 2.2 5B for local video

## Pointers

- https://github.com/nv-tlabs/lyra/tree/main/Lyra-2
- https://huggingface.co/nvidia/Lyra-2.0
- https://research.nvidia.com/labs/sil/projects/lyra2/
