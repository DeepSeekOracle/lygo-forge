# Geometry recipes

## Polar base loop
`r(θ) = base · (1 + Σ aₖ·cos(k·θ + φₖ))`, then squash `x` by a per-course factor. Use 2–3 harmonics for flowing sweepers, 4–5 for a ragged coastal outline, and overlay a square-ish base for a city-block ring. Vary `base` per course; the length fit later corrects the scale anyway.

## Uniform resample
Walk the closed loop inserting points every `TARGET_SPACING` (≈12 yd), reusing the distance to the previous accepted point so spacing does not drift. Close by construction: the walk stops when it returns within one spacing of the start and the last point is not duplicated.

## Turn-rate curvature
For each interior vertex: `dθ = signed angle between (pᵢ - pᵢ₋₁)` and `(pᵢ₊₁ - pᵢ)`, `ds = segment length`, `R = ds / dθ` over a ±W window (W ≈ 5 vertices). Use the window sum of `ds` over the sum of `dθ`, not a single-vertex ratio. Treat `|dθ| < ε` as a straight (infinite radius).

## Kink repair (relaxKinks)
Repeat until `min R ≥ targetR` or the pass cap is hit:
1. compute `R` at every vertex;
2. for each vertex with `R < targetR`, move it toward the midpoint of its neighbours, weighted by how far below target it is;
3. re-spread its immediate neighbours by the same weight;
4. re-close. Never move a splice anchor or the start/finish point.

## Biarc splice
Given anchors `A`, `B`, tangents `tA`, `tB`, first radius `r1`, turn sign `σ`:
1. `nA = rotate(tA, σ·90°)`, centre `C1 = A + r1·nA`;
2. the second centre must satisfy `C2 = B + r2·nB` and `|C1 − C2| = r1 + r2`; substitute `nB = rotate(tB, σ·90°)`, expand, and solve the resulting quadratic in `r2` — take the positive root whose sweep sign matches `σ`;
3. sample each arc at `TARGET_SPACING` from `A` to the tangent point and from the tangent point to `B`;
4. reject when `|sweep| > π` for either arc (the arc has to wrap past its own tangent point) or when either radius comes out non-finite/negative.

If the quadratic has no positive root, widen the anchors or reduce `want` — do not fall back to a straight-through curve, which reintroduces the kink the hairpin was meant to remove.

## Validation gates

| gate | rule | failure mode it prevents |
| --- | --- | --- |
| max curvature | `min R ≥ targetR` per course | un-drivable pinch, cars stop dead |
| self-overlap | closest non-neighbour approach ≥ `2·halfWidth + shoulder + margin` | course crosses itself |
| length | `abs(L − L_target) / L_target ≤ 0.05`, then uniform scale about an anchor | lap counts / distances drifting from the label |
| closure | first point within 1e-6 of last, or an explicit closed flag | seam gap, phantom lap at the join |

Log all four per course when the designer runs; a pass that prints only the length hides the two gates that matter.

## Preview page spec
- One canvas per course in a column; each canvas titled with the course name and style tag.
- Draw: built ribbon (wide stroke, road colour), centreline (thin), start/finish tick, and the tightest corner marked.
- Text readout per course: perimeter in yd and mi, min radius, corner and hairpin counts, closest non-neighbour approach.
- All geometry inlined as JSON in the page so `file://` has nothing to fetch; no CDN scripts.
- Keep the page in the game folder while iterating and delete it before committing.
