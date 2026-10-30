# BlenderWorld — Forge QA pointer

**Source:** https://x.com/QwenDevs/status/2113474673606631844  
**Repo:** https://github.com/QwenLM/BlenderWorld  
**Dataset:** https://huggingface.co/datasets/Qwen/BlenderWorld  
**Licence:** MIT  
**Decision:** **QA REFERENCE ONLY. No dataset/evaluator install.**

## What it is

A benchmark for visual agents building **editable 3D scenes in Blender** from real-world references:

- **223 tasks** across 9 categories / 22 subcategories
- **2,651 binary criteria**
- inputs: 78 text, 130 image+text, 15 video+text
- 59 tasks include specification attachments (dimensions, materials, cameras)
- output: `final.blend` + exports/textures in a submission ZIP
- evaluation: 8 adaptive Cycles renders at 1024×1024/64 samples, scene inspection,
  weighted rubric + 8 visual-quality ratings

## Why Forge does not install it

- Evaluation is **Linux-first** with Blender **4.2.10**, Node 22.17, Claude Code 2.1.220 and a
  **vision Chat Completions endpoint** (paper uses GPT-5.6-terra).
- Forge runs on Windows with its own Blender worker; no matching evaluator stack.
- The benchmark is a research harness, not an asset generator.
- Its value to Forge is the **task/rubric structure**, which we can reuse without running it.

## What Forge can borrow

Use as a scene-QA checklist:

1. Does the `.blend` exist and open? Is it editable, not a baked screenshot?
2. Are dimensions/materials/cameras the ones the brief specified?
3. Render **eight different views**, not one hero angle.
4. Check silhouette/identity from front, side, back and top.
5. Check scale against a human/known object.
6. Check materials under neutral and dramatic light.
7. Check export: GLB/FBX/OBJ + textures + no missing links.
8. Score against explicit binary criteria, not vibes.
9. Keep a failure list and a corrected render.
10. Never call a scene “3D-ready” from a single 2D image.

## Forge rules

- No paid evaluator endpoint is required; use the checklist manually.
- If a local vision model is used, record which one and its limits.
- The benchmark dataset/resources may have their own licences; do not redistribute them.
- Do not confuse a benchmark score with production readiness.
- Forge’s Blender version may differ; test imports before claiming Blender 4.2 compatibility.

## Pointers

- https://github.com/QwenLM/BlenderWorld
- https://huggingface.co/datasets/Qwen/BlenderWorld
- `forge-blender-worker`, `forge-gauntlet-blender`
