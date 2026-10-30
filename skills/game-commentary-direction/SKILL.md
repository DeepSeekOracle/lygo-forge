---
name: game-commentary-direction
description: Use when a game needs an announcer or spoken commentary.
---

# Directing spoken commentary in a game

For any game that talks: a sportscaster, an AI hero's barks, a coach, a narrator. The failure mode is
always the same — two voices at once, or a machine-gun of lines nobody asked for. Fix it with a
**director**: one object that owns the microphone, with the clock and the voice injected so the
timeline can be tested instead of hoped for. (Worked example: LYGO Arena's `director.js`, a 33-kit
arena battler whose announcer opens every map; the game-side internals live in the
`chatagent-game-upgrade` skill.)

## 1. The floor model — build this before writing a single line
- **Inject the clock and the voice**: `create({ now, say, cancel })`. `say(line, done)` speaks and
  calls `done(secondsActuallySpoken)` when the voice stops; `done` may only make the floor *longer*.
  Voices-off still calls `done`, so the pacing is identical with sound muted. This injection is what
  makes the timeline provable.
- **Hold the floor for the estimated length of the line**: `est = clamp(0.5 + chars/(13.4*rate), 1, 6.5)`.
  Measure the rate for your voice — ~13.4 chars/second is a natural read.
- **Priority table, with a hard urgent tier.** Urgent (a bell, a wipe, a goal, the final whistle)
  bypasses cooldowns, the beat and the budget. Important-but-not-urgent (a kill call, a save) takes
  its turn and is only allowed to sit in the queue longer.
- **Cadence**: a beat of silence (~1.15s) after every line, a per-speaker-class cooldown (the booth
  ~3.4s, individual bodies ~6s), a rolling budget (~9 lines / 24s, 4 / 10s) and a queue cap of a
  handful.
- **Drop stale lines, never queue them forever.** A kill called four seconds late is not a call, it is
  a rumour. Staleness is the rule that stops commentary becoming a stream.

## 2. Wire it in two halves
- The **engine offers**: one record per candidate line with `kind`, `prio`, a stable speaker id and a
  monotonic `seq`. It never speaks and never decides. Dialogue picks must be **deterministic** — never
  consume the sim's randomness from a talk path, or a seeded test deck shifts every metric.
- The **shell speaks**: one `pump*()` per frame forwards new offers into `push()`, then `tick()`. The
  shell owns the focus display — a lit panel for the booth, a highlight on the body holding the floor,
  a marker on the live feed line. Exactly one lit at a time, or a spectator cannot tell who is talking.

## 3. Match openings are a programme, not chatter
- A countdown before play belongs to the booth: **name the competitors, then ring the bell.** Worked
  spec: a 15-second countdown in which he names the arena and then each side by name, a bell line that
  lands on the clock ("Fight! … Who's gonna win?"), **3-5 seconds of silence** behind it, and only then
  booth-and-bodies alternation.
- **Speech is arithmetic and a fixed countdown does not stretch for anybody.** At ~13.4 chars/s a
  five-name list is five seconds, so a ring line plus two team lines plus the bell does not fit 15s at
  a normal read rate. Read the programme faster (~1.22), lay the cue times against the **worst case**
  lineup, keep the programme lines terse, and let the bell **preempt** what it cannot wait for
  (`preempt(prio)` cuts the floor when the live line is worth less).
- Raise a state flag as each cue fires (which side is being named) and drive the on-screen reveal off
  it, so the name card appears *with* the words. Give the tier a skip (a key plus a clickable) and
  clear the director on it, or a cut programme leaks into play.
- Cues that belong *after* the opening (the first barks answering the bell) ride the match clock, so
  one schedule covers the programme and the fight.

## 4. Prove the timeline — this is the deliverable
Replay the **real offers of real games** through a director on a fake clock with a stub voice, then
assert the timeline it produced: no two lines overlap · a beat between ordinary lines (urgent and cut
pairs exempt) · every competitor named before the bell · the bell last and on the clock · the silence
behind it at least what you promised · no more than N lines in any 10 seconds · most offers never said
· both speaker classes get a turn. Concrete numbers, the assertion list and the probe recipe:
`references/commentary-timeline-checks.md`.

## Pitfalls
- **Anchor a silence window to the END of the spoken line, never to the cue that produced it.** A
  queued line starts late, so an offer-time window expires while the line is still being said and the
  "silence" lands mid-sentence. Let the director open the window itself when the line is released.
- **Priority alone hands the booth every slot.** Measured 10 booth lines to 1 body line before an
  explicit alternation rule; 36:42 after it. Prefer the other speaker class after each line, and
  extend that rule rather than bumping a priority when a new speaker class appears.
- **Collect offers by `seq`, not by array index.** Engines cap their talk buffers and `shift()` them,
  so an index-based reader silently re-reads and skips records.
- **Replay each run through its own director**, and check that run's own names against its own accepted
  lines: pooling N runs against one concatenated replay reports a working system as broken.
- **Pooled clocks need offsets** (`at = offset + t`) or N runs stack at zero, the density is Nx and
  every rate number is meaningless.
- **The voice must use the rate the floor was held for**, and any on-canvas bubble or caption must live
  as long as the voice — scale its life by the game's speed multiplier or it vanishes mid-sentence at
  high speed.
- **One cancel path for pause, leaving and a new match.** A director that keeps its queue across a
  reset replays the last game's lines into the next one.
