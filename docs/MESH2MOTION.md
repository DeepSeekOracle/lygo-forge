# Mesh2Motion — Forge animation pointer

**Source:** https://x.com/Lummox_eth/status/2114797600687669381 (verified 2026-10-27)
**Site:** https://mesh2motion.org
**What it does:** upload a model, auto-rig it, preview walk/run cycles, export back to Blender
**Cost:** $0

## The pipeline

```
Blender (or a Sketchfab/Polyfork model)
  -> Mesh2Motion: rig + pick a cycle
  -> export back into Blender
  -> retarget / clean -> GLB with animation clips
  -> assets/models/<name>.glb  + manifest entry
```

This replaces hand-keyframing a walk cycle, which is where most of the animation time used to go.

## Rules

- It is a **web service, not a download host** — it is not in `sources.json` and must not be fetched
  by the asset bot. It is a step in the Blender worker's pipeline.
- Record the rig preset and cycle name used, so the animation is reproducible.
- Check the licence of the *model* you upload; Mesh2Motion does not grant rights to it.
