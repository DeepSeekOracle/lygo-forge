# FORGE GAUNTLET BLENDER

Protocol fixture for the worker gauntlet.

- Return only a valid Blender Python snippet.
- The snippet must create a cube with `bpy.ops.mesh.primitive_cube_add()`.
- The snippet must export a GLB with `bpy.ops.export_scene.gltf(...)`.
- No prose, no markdown fences, no tool calls, no actual file writes.
