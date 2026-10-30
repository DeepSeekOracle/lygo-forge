# A canvas draw pass is one transaction

Applies to any layered Canvas2D game (one `draw()` painting background, mask, effects, entities, HUD in
a fixed order into one context). The rules below are about *when a layer disappears* and about finding
out why without guessing.

## The mechanism (and why the report lies)
- A throw from any canvas call aborts every later draw **in that frame**. The layer *last* in the draw
  order is the one that vanishes, and whatever the base fill was (a dark coat, usually) is what shows in
  its place. The report comes back as a camera problem, a mask problem, or "X flickers in and out when
  something happens" — never as an exception, because from the player's side nothing else is visible.
- The classic throw: `arc()`/`ellipse()` with a **negative radius** (`IndexSizeError`). It arises from
  arithmetic of the shape `base - p * k - i * m` — a ring that collapses as an effect's progress `p`
  reaches 1 and its index climbs — so it fires on the LATE frames of one particular effect. That is why
  the flicker correlates with a gameplay event rather than with a place.
- **Read the console error list FIRST for any visual that appears and disappears with an event.** Collect
  them for a whole session rather than one moment: `window.onerror` plus a hook installed before the page
  loads, then read the array at the end. A screenshot cannot show an aborted frame; the error list can.

## The fixes, in the order they buy the most
1. **Skip a collapsed ring** (`if (r <= 0.6) continue;`) rather than clamping its radius to a dot — the
   effect then ends at the moment it should.
2. **Guard the formula where the effect is authored**, not at the call site, so the next effect copied
   from it inherits the guard.
3. **Wrap the whole effect renderer in one try/catch** that warns once (`console.warn`), so an effect that
   throws costs its own effect and nothing else. A frame missing one flourish beats a half-drawn frame,
   and the warning keeps the defect visible to the next session instead of silently healing it.

## Don't guess at geometry
- **Read the existing clamp before "fixing" an out-of-range condition.** A camera that looked like it
  could pan off the map already had `clamp` inside its own update, so the pan could not be the cause;
  writing the fix anyway created a regression that cost more than the original bug.
- **Never resize a mask/clip to match the thing it masks.** Cutting a clip hole to the *drawn* size of
  the content it exposes reads as the fix for a misaligned mask — until the parameter's extreme (a zoom
  level, a shake, a resize) pushes the hole past the whole canvas and the masked layer has nowhere left
  to draw: the same symptom, now permanent. A mask has a designed shape; keep it fixed and let the
  content move inside it, or bound the parameter that moves it.
- **Force the state rather than waiting for it.** Hold the engine in the suspect state from the console
  (a `setInterval` that re-sets camera/shake/speed every 30 ms) and screenshot — a 200 ms event is
  otherwise impossible to catch. Use the *same* forcing before and after a fix, and prefer a sampled
  number (near-black pixel count inside the play area, rows the layer covers) to an eyeballed "looks
  better".
- Prove the class is closed, not just the instance: drive the effect that threw for several seconds and
  assert the error list stays empty, then sweep every `arc(`/`ellipse(` whose radius contains a
  subtraction and no `Math.max`.

## Sweep the folder when a new build lands
One pass over the whole game directory, checking each of: unguarded canvas radii · `save`/`restore`
imbalance per function · timers and listeners with no teardown · effect arrays with no cap (find the
`filter`/`splice`/`shift` that *prunes* each one, not the `push` that grows it) · division by a value
that can be zero (a length taken from a filtered list is the real risk; a per-entity stats field is
normally always set) · cache-bust strings versus the commit that last changed each file · element ids
asked for versus ids present in the HTML (some are built at runtime, so a "missing" id is often
*dynamic*) · every asset path on disk · and `node --check` on every file.

Report what the sweep found **clean** as well as what it flagged — on a build whose only real defect was
found elsewhere, "no defects in this list" is a result you owe the user, not an absence of one.
