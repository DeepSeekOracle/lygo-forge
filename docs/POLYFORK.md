# Polyfork — Forge source pointer

**Source:** https://x.com/Polyfork3d/status/2115097607634481081 (verified 2026-10-27)
**Site:** https://polyfork.dev
**Library:** 2,600+ game-ready 3D models, +200 per week
**Format:** glTF, engine-agnostic (Three.js, Unity, Godot, Unreal)
**Licence:** free to use — check the per-pack terms before commercial shipment

## Why it matters for the Forge

Every model is **parametric**: colour, wear, season and state are generator parameters, not baked
textures. That means one Polyfork model can be authored to `ART_BIBLE.md` instead of being recoloured
by hand, and a weathered variant is a parameter change rather than a new download.

## How to use it

1. Register the source id `polyfork` in the asset pointer (already in `sources.json`).
2. Fetch through `POST /api/assets/fetch` like any other source — the 20 MB cap applies, so pull
   single models, not packs.
3. Record the parameter values you used in `assets/manifests/assets.json`; they are part of the art,
   and a later pass must be able to reproduce the same look.
4. Import as glTF; keep the mesh un-triangulated until the material is settled.
