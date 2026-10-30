# Verifying a distance / shot model on a course

For course games where a stated yardage, an aim marker and a roll are the whole interface (golf-likes, driving/curling/aim-and-power sports), plus the probing setup that makes any of it measurable.

## Stand up a hooked debug copy first
Clone the game dir to `<slug>-dbg` (untracked), append an export of the internals before the module's closing `})();`:

```js
/* DEBUG-HOOK (dbg copy only, never committed) */
window.__lg = { G, CLUBS, shotModel, simulateRoll, intendedCarry, lieAt, rollMu, dist, ang,
                parOf, nextAim, predictDest, worldHole, setPower };
```

Splice it with a tiny `python - <<'PY'` block that does `s.rstrip().rfind("})();")` and re-inserts, then `node --check` the file, serve the repo root, and drive the `-dbg` path with `js(...)` calls returning JSON. This is cheaper and far more honest than re-deriving the formula by reading the source.

**Re-copy the module into the checkout before every probing round.** A debug copy left on an earlier revision silently measures the OLD formula, so the numbers come back as "the fix did not land" — or as a clean pass against a bug that is still there. Delete the copy before staging the commit; it is scratch, never part of the change.

**Confirm which revision is live before diagnosing anything.** The asset's cache-bust query string is the deploy fingerprint — read the `v=` token off the served HTML and compare it with the source. A live page several versions behind means the behaviour being reproduced is code already replaced.

## The four invariants, the probe, and the bug signature

| Invariant | Probe | Bug signature |
|---|---|---|
| Stated distance is honoured | for each surface (green / fringe / rough / sand) at several distances, dial the control to N and read `dist(start, rest)` | travel = N × friction ratio: short on a slow lie, running ~2× long the moment the ball crosses onto a fast one |
| Aim marker leads forward | walk the course polyline at ~8–10 sample points, aim from each, assert `dist(marker, hole) < dist(ball, hole)` | marker jumps **behind** the ball after the first elbow; single-segment holes hide it completely |
| Capture is a real gate | sweep the control around the true distance (±5%, ±20%, ±60%) and read `holed` / `dist(rest, hole)` | a straight putt holed at any weight, or a make window blown up on short shots |
| The displayed stat can be made | parse the authored level data and run it through the same stat rule gameplay uses | a par 4 longer than the generator's own par-5 band: target unreachable, opponent unbeatable |

Print the numbers for every sample, not a pass/fail — the ratio between dial and travel is what names the broken constant.

## Rules that keep coming up
- **A stated distance is a contract, and the roll is the area under the friction curve.** Launching at `stated × μ(startSurface)` honours the number only while the surface never changes. Solve for the speed instead: sample the route ~1 yd apart up to the stated distance and set the launch speed to the **sum of per-yard friction along it** (`v₀ = Σ μ(s)·Δs`) — exactly the stop distance for a linear deceleration. Then a fringe putt rolling onto a fast green stops where the bar says instead of running half again as far.
- **Capture is an absolute speed limit, not a share of the shot.** Test the remaining roll against a constant on the current surface (≈1.2 yd = a firm putt) and give it a capture radius (≈0.55 yd) inside that lip band. One number for both bypasses the lip-out and makes weight meaningless; a window expressed as a percentage of the shot makes 2-yard taps automatic.
- **Keep the roll's integration step below the capture radius** (≈0.35 yd against a 0.55 yd cup), or a dead-on putt hops the cup between samples.
- **On a polyline course the aim marker must find the leg the player is on before picking the next waypoint.** "The first waypoint more than N yards away" is the wrong predicate: past an elbow the nearest qualifying waypoint is behind the player, so every later aim points back down the course — and every par 3 (one segment) still plays fine, hiding it.
- **Match the control's label to the model's number.** A bar that reads "power × the club's rated distance" while the code measures from the marker (which is parked on the target) makes 100% always exactly the target distance and the shot automatic. Check the auto-club too: a putter needs a real rated distance, not the target distance.
- **Delete any aid that pulls the ball toward the target.** A small magnet is unfalsifiable by feel and turns every miss into a make; replace it with a seeded per-surface break the caddie can report, so the same course plays the same way for everyone and the read is a real skill.
- **If reaching the objective depends on a semi-automatic follow-up** (arriving on the green auto-dials the power to the pin), say so in one line of the report — it is a deliberate assist, not a hidden magnet.
