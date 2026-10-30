# Forge Image-to-3D Worker

Turn a single image into an unrigged 3D base mesh with the local **TripoSR** install.

## When to use

- a prop, vehicle, environment piece, or simple character base mesh
- a fast concept-to-3D blockout from a generated image
- a character base that will be retopologized/rigged separately

Do **not** claim the output is animation-ready, game-retopologized, or a final character.

## Command

```powershell
C:\Python313\python.exe <FORGE_DIR>\pipeline\triposr.py `
  --image <PROJECTS>\demo\art\hero.png `
  --out <PROJECTS>\demo\art\3d\hero `
  --mc-resolution 256
```

CPU-first by default so the shared Gemma engine stays resident. Use `--gpu` only with the
GPU lease free or the engine paused.

Outputs:

```text
<out>/0/mesh.glb
<out>/triposr.json
```

## Brief JSON for the Forge dispatcher

```json
{
  "image": "<PROJECTS>/demo/art/hero.png",
  "out": "<PROJECTS>/demo/art/3d/hero",
  "mc_resolution": 256,
  "bake_texture": false,
  "gpu": false
}
```

Dispatch with skill `forge-image-to-3d` and agent `triposr-local`.

## After TripoSR

1. Ingest the GLB into the asset vault.
2. Run Blender prep for scale, triangulation and FBX export.
3. Retopologize/clean the mesh.
4. Rig with Rigify or Mixamo.
5. Validate deformation and animation in Unity/Web before use.

## Limits

- Single-image reconstruction invents unseen geometry.
- Thin parts, hands, faces, text and symmetry are weak points.
- No rig, no UV quality guarantee, no animation.
- TripoSR is MIT; input image rights remain the operator's responsibility.
- Do not run GPU TripoSR while ComfyUI/Wan holds VRAM.
