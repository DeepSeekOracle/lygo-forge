# Roadside features on an existing sampled track

For building real geometry alongside a circuit whose path already exists — a pit lane, a starting grid,
kerbs, barrier runs, service roads. These fail visually and behaviourally at once: a feature that floats
or leaves ground showing through a join reads to the operator as "not done", and decorative geometry given
a collider can silently park the whole AI field.

## 1. Measure the cross-section before placing anything

Every offset you choose is a claim about the track's existing furniture. Dump it first — for each candidate
object, nearest path index -> `cumulative[i]` -> project its position onto the cross-track axis:

```
Vector3 fwd  = path.ForwardAtDistance(d);
Vector3 side = Vector3.Cross(Vector3.up, fwd).normalized;
float lat    = Vector3.Dot(obj.position - path.PointAtDistance(d, 0f, 0f), side);
```

On one circuit every barrier sat at **lat = +-10.1 m** while the drivable edge was nearer **4 m**. A pit
lane placed at a guessed 11 m offset therefore straddled the barrier line — which produced two separate
complaints ("the road doesn't connect", "the original barriers are still there") from one guessed number.
Log the lateral alongside the object's distance along the circuit so you can pick the span to change.

## 2. Build by offsetting along the path, oriented by the path

Place and orient everything from the path itself so it follows the circuit rather than being eyeballed:
`path.PointAtDistance(d, lateral, y)` for position, `Quaternion.LookRotation(path.ForwardAtDistance(d))` for
rotation. A feature that is one long run (a wall, a stripe) is a series of short segments sampled the same
way, each oriented by its own local forward.

## 3. A join is a funnel between two continuous edge functions

Never build a spur as a fixed-width band that slides sideways: where the band's offsets change, the ground
between the main surface and the spur is simply never paved — reported as **grass showing at the ends**.
Instead make the surface one strip between `innerAt(d)` and `outerAt(d)`, both continuous functions of
distance, so the funnel fills itself. Easing one edge while the other stays fixed leaves a staircase at the
step; ramp both, and give the outer edge its own ramps where the spur widens for props.

## 4. Run the inner edge under the main surface

An edge that stops at your *estimate* of the main surface's edge leaves a sliver of unpaved ground along
the join — a thin line of green down the fork that reads as a seam. Measured edge ~4 m: start the spur's
inner edge at ~2.5 m so the paving continues underneath where the two overlap. That is cheaper and more
robust than trying to match an edge you cannot see.

## 5. Pave under the props, out past everything you place

A slab or garage sitting on bare ground reads as **misaligned with the ground**, however square it is.
Extend the paved apron past the prop line (stalls at ~25 m out -> pave to ~29.5 m) so every prop has paving
beneath it. Align the row to the path's forward, keep the pitch even, and size each slab just under the
pitch so the gaps read as deliberate.

## 6. A pit wall is open across both merges

The wall belongs along the lane's inner edge over the parallel section only, with the entry and exit merges
left open — that is what a pit wall does, and it is also what makes it structurally impossible for the wall
to end up on the racing line as the lane flares in and out.

## 7. Clear the original barrier run across the span

The existing barriers do not know about the feature you just built. Find them by name (a shared name such
as `barrierWall`), decide by measured lateral (skip the far side), and delete across the feature's span
(~40 m before to ~160 m after the line for a pit lane). Deletion is idempotent in effect: a later rebuild
of the same feature finds only the stragglers, so report the count and do not expect it to match.

## 8. No colliders on decorative geometry until it is wired

Give walls colliders only once the space they enclose is somewhere cars are *meant* to go. Nothing is worse
than a solid wall in the wrong place: a first pass whose wall swept across the racing line left **5 of 7
rivals at 0 kph** with the driver code untouched. Scenery that can be driven through is a temporary
cosmetic defect; scenery that blocks the circuit is a broken build.

## 9. Re-measure the field after the geometry lands

Geometry changes containment, so they are a driver-behaviour change in disguise — run the AI discipline
numbers (speed, off-line incidents, field spread) after scenery lands, not only after driver edits. Expect
the trade: removing a stretch of barrier to open a pit entry gives cars somewhere to run off, so a small
number of self-recovered excursions is the correct reading, not a regression.

## 10. Scene-only changes need only a rebuild

Geometry created by an editor script and persisted with `MarkSceneDirty` + `SaveScene` is scene data, not
code: rebuild without recompiling. Prove the rebuild happened by the artifact's mtime. Drive the script
from an **`eval_file`** (a statement list) rather than a one-expression `eval`, which must return a value
and fails otherwise with "not all code paths return a value".

## Standing requirement: every track ships with its pit lane

Long races need a pit lane, and it should be designed into each circuit as geometry — entry merge, parallel
lane, pit wall, stalls — even before any fuel, damage or pit-stop logic exists. Build the corridor now and
wire the behaviour in a later pass; a track built without one has to be reopened later.
