# FORGE MIXAMO RIG PIPELINE

Rig and animate a humanoid mesh with Mixamo + Blender instead of spending LLM tokens on skeleton math.

## Pipeline

```text
raw humanoid mesh (.glb/.fbx/.obj)
→ import into Blender
→ Mixamo-compatible humanoid orientation/scale
→ export FBX for Mixamo (or use Blender rigging)
→ Mixamo: upload, auto-rig, choose animation
→ download FBX (with/without skin)
→ import into Blender/Unity
→ retarget/rename clips
→ verify in engine
```

## Rules

- Start from a **single, clean humanoid** mesh in a neutral A/T pose.
- Apply scale/rotation; humanoid height in meters; feet at origin.
- Remove armature/rig from the source if it is not Mixamo-compatible.
- Use **one** skin/armature; no overlapping meshes or hidden polygons.
- Mixamo auto-rig works best on clearly separated limbs; check hands/feet.
- Download with skin for a rigged character; without skin for animation-only retargeting.
- Rename clips for the engine (`Idle`, `Walk`, `Run`, `Attack`, `Death`).
- Test root motion in-engine; Mixamo “in place” clips have no root translation.
- Record the Mixamo clip name/URL, download date, and licence terms.

## Licensing

- Mixamo is free with an Adobe account, but its terms must be checked before commercial use.
- Do not redistribute Mixamo animation files as a standalone asset pack.
- A generated mesh still needs its own licence/provenance.
- Tripo/Meshy are optional hosted mesh services with free-token limits; Forge does not require them.

## Forge use

- **3D Refine Worker** cleans/scale-checks the mesh.
- **Blender Tool Worker** imports/exports FBX and verifies the armature.
- **Technical Artist** retargets clips and tests in Unity/Web.
- Asset Pointer records source mesh, rig, clip licences and hashes.

## Acceptance

- mesh deforms without collapsing at shoulders/hips/knees
- no visible weight spikes
- feet stay planted in idle/walk
- clip names match the engine state machine
- animation plays in-engine, not only in Blender
- licences/provenance recorded
