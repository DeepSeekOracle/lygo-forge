# Game audio: verifying it, and briefing someone else to produce it

For a build whose sounds are heard by a human but produced by an agent that cannot listen: what to require
as evidence, and how to write the brief.

## You cannot judge quality by ear - so measure character

Subjective verdicts ("sounds good") are the owner's call and must never be claimed by the agent. What an
agent *can* establish, and should report:

| Measurement | What it settles |
|---|---|
| FFT / spectrogram | harmonic peaks present, or flat broadband energy (= the static mistake) |
| noise floor vs harmonic peaks, in dB | whether a "thin air bed" is actually thin (~20 dB down) |
| loop seam discontinuity (last vs first sample, dB) | whether the clip clicks when it loops |
| peak / RMS dBFS | headroom against the runtime multiplier (e.g. a 0.12-0.55 volume curve) |
| the same three numbers for the old clip | an A/B that survives the next session |

Add the build result and the deployed payload size, and state plainly which claims remain **unverified**.

## Design facts that decide whether a clip survives the engine

- **One clip, many pitches.** Unity pitch-shifts by resampling, so a single loop is heard across a whole
  range (0.95 -> 2.15 on a racing build). Audition and measure both ends before shipping.
- **Seamless loop is a property of the waveform**, not of the player: the first and last samples must join
  without a click, since the loop never stops for the length of a race.
- **Master level is not the mix level.** If the code multiplies the clip by a curve (idle bed -> throttle),
  a loud master becomes a clipped mess in play: peak <= -3 dBFS, no brickwalling.
- **Audibility is gated in code, not in the clip.** A good clip still plays at load, in the menu and on the
  grid if the gate is wrong (see the state-and-motion rule in SKILL.md). Fixing the sound and fixing the
  gate are two separate jobs.

## Writing the brief for another agent

A brief that survives handover carries, in this order:

1. **Exact paths and the exact build command**, plus the success marker to look for in the build log.
2. **The one artifact in scope**, and a by-name **do-not-touch list** of everything already approved. When
   the owner says one effect is bad and the rest are good, that list is the difference between a fix and a
   rewrite nobody asked for.
3. **The design spec in measurable terms** (energy band, harmonic vs noise, pitch range, seam, format,
   level), not adjectives.
4. **The pipeline with its traps** (copy `Build/*` only and never the regenerated template page; a helper
   injector wants a native path; scoped `git add`; poll the payload, not the page).
5. **Evidence instead of opinion** - the table above - written to a `REPORT.md` inside the handoff folder.
6. **The acceptance test named as the owner's listen**, so the delegate marks anything unverified rather
   than rounding up.

Then treat the delegate's report as a claim to check: the measurements are what make it checkable, and a
flat spectrogram settles it without listening at all.
