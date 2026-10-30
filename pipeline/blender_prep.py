"""Blender headless mesh prep for the image-to-3D -> rig handoff.

Usage:
  blender.exe -b --factory-startup --python blender_prep.py -- \
    --input hero.glb --out-dir prepared --height 1.8 --decimate 0 --rigify

Produces:
  prepared/model.glb  cleaned mesh
  prepared/model.fbx  Mixamo upload candidate
  prepared/model.blend
  prepared/rigify.blend  optional Rigify metarig parented to the mesh
  prepared/prep.json

This is a prep/retarget starting point, not a guarantee that an arbitrary
generated mesh is animation-ready. Inspect the mesh and fix weights manually.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import bpy
import addon_utils


def args() -> argparse.Namespace:
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    p = argparse.ArgumentParser()
    p.add_argument("--input", required=True)
    p.add_argument("--out-dir", required=True)
    p.add_argument("--height", type=float, default=1.8)
    p.add_argument("--decimate", type=float, default=0.0)
    p.add_argument("--rigify", action="store_true")
    return p.parse_args(argv)


def meshes() -> list:
    return [o for o in bpy.context.scene.objects if o.type == "MESH"]


def bounds(obj):
    from mathutils import Vector
    pts = [obj.matrix_world @ Vector(c) for c in obj.bound_box]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    return lo, hi


def main() -> int:
    a = args()
    src = Path(a.input).resolve()
    out = Path(a.out_dir).resolve()
    out.mkdir(parents=True, exist_ok=True)

    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(src))
    body = meshes()
    if not body:
        print(json.dumps({"ok": False, "error": "no_mesh"}))
        return 2

    # Join multiple mesh parts into one object, apply transforms.
    bpy.ops.object.select_all(action="DESELECT")
    for o in body:
        o.select_set(True)
    bpy.context.view_layer.objects.active = body[0]
    if len(body) > 1:
        bpy.ops.object.join()
    obj = bpy.context.active_object
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)

    lo, hi = bounds(obj)
    size = hi - lo
    target = float(a.height)
    if target > 0 and size.z > 0:
        s = target / size.z
        obj.scale = (s, s, s)
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
        lo, hi = bounds(obj)
    # Put feet on the floor, center X/Y.
    obj.location.x -= (lo.x + hi.x) / 2.0
    obj.location.y -= (lo.y + hi.y) / 2.0
    obj.location.z -= lo.z
    bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)

    if a.decimate and a.decimate > 0:
        mod = obj.modifiers.new("Decimate", "DECIMATE")
        mod.ratio = max(0.05, min(1.0, float(a.decimate)))
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=mod.name)

    # Triangulate for predictable engine import.
    tri = obj.modifiers.new("Triangulate", "TRIANGULATE")
    bpy.ops.object.modifier_apply(modifier=tri.name)

    glb = out / "model.glb"
    fbx = out / "model.fbx"
    blend = out / "model.blend"
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.export_scene.gltf(filepath=str(glb), export_format="GLB", use_selection=True)
    bpy.ops.export_scene.fbx(filepath=str(fbx), use_selection=True, apply_scale_options="FBX_SCALE_ALL")
    bpy.ops.wm.save_as_mainfile(filepath=str(blend))

    rigged = False
    rigify_blend = None
    if a.rigify:
        try:
            bpy.ops.preferences.addon_enable(module="rigify")
            bpy.ops.object.armature_human_metarig_add()
            rig = bpy.context.active_object
            # Match the metarig to the prepared character height.
            lo2, hi2 = bounds(obj)
            h = max(0.1, hi2.z - lo2.z)
            rig.scale = (h / 1.8, h / 1.8, h / 1.8)
            bpy.context.view_layer.objects.active = rig
            bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
            rig.location.z = lo2.z
            bpy.ops.object.select_all(action="DESELECT")
            obj.select_set(True)
            rig.select_set(True)
            bpy.context.view_layer.objects.active = rig
            bpy.ops.object.parent_set(type="ARMATURE_AUTO")
            rigify_blend = out / "rigify.blend"
            bpy.ops.wm.save_as_mainfile(filepath=str(rigify_blend))
            rigged = bool(obj.find_armature())
        except Exception as exc:  # noqa: BLE001
            print(f"rigify warning: {type(exc).__name__}: {exc}")

    meta = {
        "ok": True,
        "source": str(src),
        "glb": str(glb),
        "fbx": str(fbx),
        "blend": str(blend),
        "rigify": str(rigify_blend) if rigify_blend else None,
        "rigged": rigged,
        "vertices": len(obj.data.vertices),
        "triangles": len(obj.data.polygons),
        "dimensions": [round(v, 4) for v in obj.dimensions],
        "note": "Rigify auto-weights are a starting point. Validate deformation and reweight before animation.",
    }
    (out / "prep.json").write_text(json.dumps(meta, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(meta, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
