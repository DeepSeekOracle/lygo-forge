# Debugging terrain, water and ribbon surfaces

The bug class: the rendered scene disagrees with the model the sim tests against, or a surface feature
renders blobby, torn, or absent. Worked out on a procedural three.js golf course whose lakes "sometimes
covered the whole course"; the method is game-agnostic.

## Order of attack
1. Read the model the sim owns first (the water/shape rect list, the bounds helper, the lie/inside test)
   and print its numbers for the feature in question. Never start from pixels.
2. Quantify across **every** hole before changing anything — "sometimes" means a subset. Find which, and
   by what metric.
3. Draw the feature's footprint with a dev-only marker in an unmistakable material (pure red) and
   screenshot it beside the natural render. Marked and natural disagreeing in extent = render path;
   agreeing = the data.
4. Fix the data-layer scale problem (cap/normalise) separately from the render bug — they are independent
   and both are real.
5. Re-run the audit and diff the table against the previous run before claiming a fix.

## Dev hook + coverage audit
Add to a working copy (never commit it), just after boot, behind a localhost guard
(`location.hostname === '127.0.0.1' || location.hostname === 'localhost'`):
- `goto(courseId, holeIndex)` — rebuild that hole so holes can be hopped without playing them.
- `audit()` — one row per hole: `{id, span (play box WxH), nW (feature rect count), maxDim,
  pctRect (feature area as % of the play box), pctCorridor (share of the play corridor over the feature),
  ellVsRect (stray of an ellipse approximation from the true rect)}`.

Print the table **sorted by the worst metric**, never in hole order. Expose the helpers on the hook object
itself — nesting them under a `debug()` sub-object turns `__lg.water()` into a TypeError; list what exists
with `Object.keys(window.<Renderer>)` before calling into it.

Screenshots: `cdp("Page.captureScreenshot", format="jpeg", quality=58)` → base64 → file → `vision_analyze`
that path; one capture per call, and `cdp("Page.bringToFront")` first or rAF throttling leaves the scene
in a mid-state.

Delete the hook before committing and prove it: `typeof window.__lg === 'undefined'` plus a clean error list.

## Tuning sweep (data layer)
- Play box from tee + path points + pin; floor each side at ~60 yd.
- `cap = boxArea * 0.42`; for each rect over it, `k = sqrt(cap / area)` and scale about the rect's own
  centre; skip the shrink if either side would drop under ~26 yd.
- Shrink rather than move or delete: rects containing the tee or pin are already dropped by the world
  builder, so what remains is a legible carry — keep it where the designer put it.

## Baselines (worked example — regression reference)
After the sweep on that golf course, over three authored courses plus generated holes: worst hole 38.7 %
rect coverage, none over 45 %, max corridor overlap 43.8 % (a legitimate par-3 carry). Chapel Pond
79.7 %/82.2 % → 20.8 %/39.3 %; one creek 72 yd at its longest; another course 8.4 % via a 520-yd long
thin rect — **long and thin is fine, large and round is the smell.**

## Traps
- A fixed `?v=` query serves the stale file: bump the version for each touched file and open a fresh tab;
  an explicit cache-disabled reload did not beat it, a new session with a new `?cb=` did.
- A backgrounded tab throttles rAF — bring the page to the front after every navigation.
- A rebuild-per-hole recreates materials, so a red debug material does not leak into the next hole; a page
  that is never reloaded keeps it — reload between "natural" checks.
- After fixing the shape, re-check what the user actually saw: re-shoot the hole and confirm the feature
  reads correctly (bank ring visible, no ribbon crossing it, no hard plane edge) rather than only that the
  metric moved.
