# Pacing measurement probes

How to prove a pacing/horde change actually did something, without playing the game by hand.
Budget the harness: one gameplay fact per burst, and re-open a fresh tab between bursts.

## Before any sample
- **Verify the clock advances.** An occluded or backgrounded tab throttles rAF and many games pause on
  `visibilitychange`, so the run clock freezes and every counter reads 0 — indistinguishable from a
  dead curve. Read the run clock twice, 3 s apart, before believing anything. Restore a frozen loop by
  closing the stale page targets, opening a fresh tab, then bringing it to front *and* setting the page
  lifecycle to active plus focus emulation; a named browser session is a separate browser where the
  loop may never run at all.
- **Set the clock the mode reads**, not the one that is convenient: run time in endless/survival, a
  per-level clock reset on load in authored modes. Probing a time dial against the wrong clock reports
  "no change".
- **Arm the player first** (a huge health pool) so the run does not close mid-window; a closed run
  stops the clock and every delta silently reads zero.
- **Re-assert the unfreeze INSIDE every iteration, not once before the loop.** A sampling loop that
  brings the tab to front once and then collects five samples can return the *same* pre-jump string five
  times — clock still 0:00, still "wave 1" — while a screenshot taken after the loop shows the real state
  (15:00, wave 16). Treat a byte-identical sample series as a frozen tab, not a stalled game, and
  re-assert front-focus + active lifecycle on each pass.

## Probes
- **Throughput without a stopwatch:** sample the kill counter and the live population ~10 s apart. In a
  saturated field the kill rate equals the spawn rate, so the delta *is* the spawn rate. Compare it
  before/after the change at the same clock time.
- **Force one pulse instead of waiting:** set the spawner's own timer to 0 rather than idling out the
  interval. It is deterministic and lands in the first live window after a load, before the tab freezes.
- **Jump the clock instead of waiting it out.** The app's own state surface (`window.<App>.get()`) hands
  back the live run object, so setting the run clock to 900 lands on wave 16 in one eval and forcing every
  spawner timer to 999 fires the next pulse; arm the player (huge health pool on each entity) so the
  window does not close under you. Sample the low-clock and high-clock series back to back — an
  order-of-magnitude separation (60 fodder at wave 1 vs 220+ with named foes only in the second) is the
  proof the band is live, and the run reaches its late state in seconds instead of 15 minutes.
- **Do the static half by lifting the real functions out of the source file and `eval`-ing them** (regex
  the definitions out of the game module into a scratch script), never by re-typing the formula into the
  probe: a re-typed copy tests your arithmetic, not the game, and cannot catch a dial the patch forgot
  to band.
- **Prove a bullet sponge by ratio, not by absolute health:** read an elite's health next to a fodder's
  in the same sample and report the multiple (~50-90x is a sponge).
- **Prove the stacking punishment:** force three or more pulses back-to-back, then read the live elite
  count, the rage/damage-multiplier field, and the HUD count pill.
- **Prove losability by idling:** armed player, no input, sample health early and late. Early = a scratch,
  late = the pool gone in seconds and the run closed with the score committed. This is the one pacing
  claim that cannot be inferred from spawn counts.
- **Per-mode parity:** the same shared layer should be probed once per mode, on that mode's clock, since
  authored modes often spawn extras ~10 tiles from the player rather than at a fixed arena radius.

## Reporting
Give the user the measured numbers (density at t=20, throughput per 10 s, elite health vs fodder,
health lost per second early vs late) and the dial names with their current values, so the next tuning
pass is a one-line change. When a HUD pill shows a different number than the one driving difficulty (a
wave indicator that reports the floor), quote the number you actually measured and name the dial that
produced it — a figure the player cannot see is a figure the user cannot check.

## The render loop is part of pacing

A sequence that plays slower than it was authored to is usually not the dial, it is the loop. Check this
before spending a burst on curve probes.

- **Measure the frame budget first.** Paste a rAF counter and sample in the phase you are judging (a menu
  at 60 fps hides a match at 15):
  `(() => { window.__f=0; const l=()=>{window.__f++;requestAnimationFrame(l);}; requestAnimationFrame(l); return 'x'; })()`, then `Math.round(window.__f / seconds)`.
- **A simulation stepped once per rendered frame makes the authored duration fiction**: an event table
  authored at ~2.6 s of playback takes 19 s at 15 fps. Accumulate real time and step a fixed tick table
  (`acc += dt; while (acc >= TICK) { step(); acc -= TICK; }`), then measure the sequence's wall clock from
  the moment it starts until the phase readout leaves playback, at each speed.
- **A speed multiplier is a pacing dial; skip is a workaround.** Persist it (x1/x2/x4 on a key plus a
  control).
- **Prove a layer repainted with a pixel sample, not with a screenshot.** Sample a box around the point
  that should change before and after the event — a stale cache shows a delta near zero where change is
  expected, a real repaint shows tens of thousands across a 300x130 box:
  `const d = g.getImageData(cx-150, cy-60, 300, 130).data;` then sum the RGB triples. Remember the
  device-pixel-ratio factor when converting a client point into canvas pixels.
- **Invalidate a cached scene on every one of:** a tile revelation, reclaimed ground, the timed fog
  resweep, a new map, a **map-size change**, and a texture finishing load (an async loader otherwise keeps
  the placeholder art forever). Key the cached visible-tile list on map size and seed alongside the camera.

## Driving a turn-based game by script

- **Derive click points from the game's own hover/hint readout:** scan a grid with `mouseMoved` and click
  the tile whose readout qualifies (land/fog, not water). A coordinate recorded on one seed lands on water
  under the next, the action silently no-ops, and every later step still "passes".
- **Assert the post-condition**, not that a click was sent: the counter reached 0, the phase changed, the
  expected line is in the log. Re-read the phase between turns — an action that queues in one phase no-ops
  in another.
- `Input.dispatchMouseEvent` needs a `mouseMoved` before the press for hover state to settle (~150 ms).
