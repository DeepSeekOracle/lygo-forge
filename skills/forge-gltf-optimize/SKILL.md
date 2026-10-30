# FORGE GLTF OPTIMIZE

Use `gltfpack` (meshoptimizer) to reduce GLB/GLTF size and improve GPU vertex/index efficiency.

## Installed

```text
Version: 1.3
Path:    <FORGE_DIR>\tools\gltfpack\gltfpack.exe
Licence: MIT
```

## Command

```powershell
<FORGE_DIR>\tools\gltfpack\gltfpack.exe `
  -i <input.glb> -o <output.glb> -cc
```

Options:

- `-c` compressed geometry
- `-cc` higher compression ratio
- `-cz` even higher compression
- `-tc` convert textures to KTX2/BasisU (requires texture pipeline and engine support)
- `-kn` keep named nodes (use when the engine/rig needs names)

## Verified

Forge Blender smoke GLB:

```text
input:  3,460 bytes
output: 2,356 bytes
command exit: 0
```

This is a size test, not a visual/rig proof. Re-import the output and inspect it.

## Rules

- Keep the source GLB; never overwrite it.
- Do not use `-tc` unless the target engine supports KTX2/BasisU.
- Preserve node names when animations/rigs depend on them.
- Verify the packed GLB in the target engine, not only in gltfpack.
- Record input/output sizes, options, hash and engine test in the job note.
- If compression saves little or breaks materials, keep the original and state why.
- meshoptimizer is MIT; preserve its licence notice in the tooling docs.

## Acceptance

- output opens in the target engine
- geometry, UVs, materials and rig/animations survive
- node names survive when required
- size/performance result recorded
- original source retained
