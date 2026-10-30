---
name: procedural-track-design
description: Use when designing procedural tracks/courses or their terrain, water and ribbon surfaces.
---

# Designing procedural tracks and courses

For any course built from sampled centreline points — racing circuits, rally ribbons, road splines, path levels — where the goal is authored character (long straights, a folded hairpin end, a blocky city ring) instead of a random blob, and the result must still be closed and drivable.

## Pipeline
1. **Base loop → dense ground truth.** Build the shape as a closed polar loop (harmonics + squash, chosen per course), then resample uniformly at the density the sim samples at (~12 yd suits a car-sized track). Treat that polyline as the truth; every later stage indexes into it.
2. **Feature plan per course.** A small table `{n, mult, style, hairpin, want}` plus which index spans each feature splices between: `mult` sets feature length against a base pitch, `want` the target corner radius. Take the numbers the UI will print (corner count, hairpins, length) from the plan, never from post-hoc measurement.
3. **Splice by anchors.** Pick two sample indices, cut the span between them, insert the feature path, leave the rest untouched. Both splice ends are the loop's own points, so closure stays exact for free.
4. **Repair residual kinks.** Smooth only where the local radius is below target; leave straights and gentle sweepers alone.
5. **Validate, then fit.** Gates: minimum radius, closest non-neighbour approach ≥ 2·halfWidth + shoulder + margin, length inside tolerance. Fit length by uniform scale about an anchor point — scaling about an anchor preserves closure.

## Rules that cost hours when violated
- **Hand the builder the dense polyline (~12 yd), not a decimated control polygon.** A Chaikin-style smoothing pass over a coarse, uneven control polygon overshoots and silently emits corners far tighter than any radius check on the *input* catches (measured 13–19 yd against a 40-yd requirement while length and closure still passed). Diagnose on the **built** line.
- **Curvature from turn rate**: `R = ds / dθ` over a window. Circumradius from triangle area is noise-dominated at small spacing and reports 4-yd radii on straights.
- **Never let a from-scratch walker close the loop positionally, and never distribute the closure error across points (`shear by i/n`).** Corners explode in count and radii collapse. Keep the anchors fixed; move only interior samples.
- **Biarc splice for hairpins**: one arc leaves the first anchor along its tangent, one enters the second, `r2` in closed form from `r1`. Accept a solution only when each sweep's sign matches its signed radius and `|sweep| ≤ π`; otherwise the splice folds back through itself.
- **Blend a straight's middle samples toward the chord** (smooth weight, ~55 %) and re-derive that feature's own arc lengths; a hard cut leaves a curvature discontinuity at both ends.
- **Prove the line is overlap-free before the sim sees it.** A designed line that crosses itself yields an undrivable course; report closest non-neighbour approach alongside the ribbon width so the margin is visible.

## Surface features: terrain, water, ribbons (the render must equal the model)
- **Build every surface from the same numbers the simulation tests against.** A pond is a rect the lie test reads (`inAnyWater`); drawing that rect as an ellipse (`CircleGeometry` with half-axes `0.52w x 0.52h`) turns a 520-yd creek into a blob and makes the picture disagree with the penalty. When a feature "sometimes covers the whole course", read the shape list the sim owns before touching textures or lighting.
- **A carve needs grid resolution finer than the carve.** One coarse plane (72 quads across 2200 yd) resolves a lake only where a vertex lands inside it, so a single lake renders as torn, disconnected blobs that read as two lakes. Use two tiers: a cheap coarse far plane for the horizon plus a fine near plane sized to the hole (~4 yd/quad). Carve with explicit floor-depth and shore-ramp constants, and place the bank mesh where the ramp ends so the drawn bank *is* the tested shoreline.
- **Winding: a triangle fan indexed CCW in XZ is back-facing when seen from above, so it renders invisible.** Emit `idx.push(0, t + 1, t)` (or reverse the fan). If a body vanishes right after a geometry edit, suspect winding before re-diagnosing the edit. Animate the axis the geometry actually uses — an XZ plane with no mesh rotation moves local Y, not Z.
- **Clip ribbons against the features they cross.** Fairway/first-cut/cart-path/OB meshes follow the height field, so an unclipped ribbon dives into the drained basin and the water plane is drawn over it — which gets reported as "the water is on top of the fairway". Drop quads whose centre falls inside a feature rect (inset ~1.5 yd).
- **Fit the camera to the union of the play corridor and the features.** A tee-to-pin fit hides a lake wider than the corridor, and an off-screen lake is reported as "the lake is missing".
- **Tame an oversized feature by scaling it in the data layer, about its own centre.** Frame the play box from tee + path + pin (floor each side at ~60 yd so a straight hole still has a box) and cap feature area at a fraction of it (~40 %): `k = sqrt(cap / area)`, skipping the shrink that would take a side under ~26 yd (a sliver reads as a wall). Never move and never delete — the shoreline keeps its relation to the pin, the layout stays legible, and the audit stays comparable run to run.
- **"Sometimes" is a distribution: hop every hole and score every one.** Per hole compute coverage as % of the play box, longest dimension, and feature-inside-corridor %; fix by threshold, then re-run and diff the table. Two screenshots cannot distinguish a one-in-nine defect from a systematic one. Delete the dev hook before committing and prove it (`typeof window.__lg === 'undefined'`).
- **Bump the cache-buster for every file you touch and open a fresh tab** — a fixed `?v=` keeps serving the old script, and a reload that "ignores cache" may not beat it.
- **A spur that joins the main surface is a funnel between two continuous edge functions — never a fixed-width band that slides sideways.** Where a moving band's offsets change, the ground between the main surface and the spur is simply never paved, which gets reported as grass showing at the ends. Run the spur's inner edge *under* the main surface (start inside the edge you measured, not at your estimate of it, or a sliver of green runs down the join) and pave out past every prop you place on it, or the props read as not aligned with the ground.

Roadside construction on an existing sampled path — pit lanes, grids, barrier runs, merge geometry, prop paving: `references/roadside-feature-construction.md`.

The dev-hook/audit recipe, worked baselines and the remaining traps: `references/terrain-water-debugging.md`.

## Preview before merging (do this first)
Iterating inside the game costs a reload per idea; the same iteration standalone costs seconds.
1. A Node script lifts the designer's functions out of the game source with a brace-matching extractor and writes the control line + built line to JSON. Functions must be plain `function name(...)` declarations to be liftable.
2. Generate a self-contained HTML page with the data inlined: one small canvas per course — built ribbon, centreline, start/finish marker, min-radius and perimeter readout, dark page (`#0b0f14` bg, `#9fb3c8` text).
3. Open it with `file:///` in the browser tool and screenshot; iterate on the geometry there.
4. Delete both scratch files before any commit — they are dev artifacts, not shipping code.

## Verification
- Render the **built** line, not the plan: the screenshot must show the polyline the game will sample.
- A course is only proven inside the real build: screenshot a driven frame. Start the heat, wait out the countdown, then drive and read the speed before trusting the frame — synthetic keypresses dispatched while a menu is open silently do nothing.
- Keep the design's claimed facts (length, corners, hairpins, style) in code and have the UI read them, so a stat line or thumbnail cannot drift from the track it launches.

Concrete formulas, the gate table, and the preview-page spec: `references/geometry-recipes.md`. Surface-feature debugging (render-vs-model audit, footprint markers, tuning caps, baselines): `references/terrain-water-debugging.md`. The chatagent.ca games this was first built for are covered by `chatagent-game-upgrade` (user-owned skill; do not edit it — extend this one instead).
