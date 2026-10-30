# Rig and Animation Pipeline

**Status:** base mesh and rig prep work; animation library is the remaining manual step.

## Pipeline

```text
image
  -> TripoSR base mesh (GLB)
  -> Blender cleanup / scale / triangulate
  -> retopology or decimation
  -> Rigify metarig OR Mixamo auto-rig
  -> animation clips
  -> engine import + validation
```

## 1. TripoSR

```powershell
C:\Python313\python.exe <FORGE_DIR>\pipeline\triposr.py `
  --image <PROJECTS>\demo\art\hero.png `
  --out <PROJECTS>\demo\art\3d\hero
```

CPU-first. Output is an unrigged GLB.

## 2. Blender prep

```powershell
& "J:\SteamLibrary\steamapps\common\Blender\blender.exe" -b --factory-startup `
  --python <FORGE_DIR>\pipeline\blender_prep.py -- `
  --input <PROJECTS>\demo\art\3d\hero\0\mesh.glb `
  --out-dir <PROJECTS>\demo\art\3d\hero\prepared `
  --height 1.8 --rigify
```

Outputs `model.glb`, `model.fbx`, `model.blend`, and optionally `rigify.blend`.

## 3. Rig choice

### Rigify (local, free)

- Good for a humanoid base and a control rig.
- Auto-weights are a **starting point**; inspect elbows, knees, shoulders, fingers.
- Generate the final rig from the metarig in Blender (`Armature > Generate Rig`).
- Not a substitute for clean topology.

### Mixamo (free web service)

- Upload the prepared **FBX**.
- Auto-rig humanoid.
- Download animations.
- Check licence/terms at time of use; do not redistribute the service's assets as standalone packs.
- Works best with a clean, A/T-pose humanoid; TripoSR may need manual pose cleanup.

## 4. Animation clips

Minimum for a character-driven slice:

```text
hero:     idle, walk, run, attack, hit, death, interact  (7-10)
enemy A:  idle, walk, attack, hit, death                   (5)
enemy B:  idle, walk, attack, hit, death                   (5)
boss:     idle, windup, attack, hit, death                 (5-8)
```

No local animation library is installed. Current options:

- Mixamo clips
- hand-keyed Blender animation
- CC0 animation packs (verify licence per pack)
- procedural motion for simple objects

## 5. Engine validation

Unity:

- Humanoid avatar configured.
- Root motion or in-place decided per clip.
- No foot sliding at the target speed.
- Hit boxes aligned to animation timing.
- Import scale is 1 unit = 1 metre.

Web/Three.js:

- GLB skeleton exported.
- AnimationMixer clip names match code.
- Bounding box/collider updated after animation.
- Draw calls and skinning cost measured.

## Honest blockers

- No automatic retopology pipeline.
- No local mocap / facial animation.
- No large licensed animation library. A Quaternius CC0 Drive fetch failed and was removed; do not claim a clip library.
- Auto-rig quality on generated meshes is variable.
- Do not claim a character is animation-ready until it deforms correctly in-engine.
