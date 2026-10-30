# Commentary timeline checks — the numbers and the recipes

## The cadence table (starting point, then measure)
| knob | value | what it buys |
| --- | --- | --- |
| `cps` | 13.4 chars/s at rate 1 | voice length -> floor length |
| `gap` | 1.15 s | a beat between ordinary lines |
| `gapUrgent` | 0.5 s | how fast a bell may follow the line before it |
| booth cooldown | 3.4 s | the booth cannot speak twice inside this |
| body cooldown | 6.0 s | one body cannot talk twice inside this |
| `stale` | 2.6 s | drop an ordinary line older than this |
| stale, big / urgent | 4.7 / 5.7 s | a kill call / an urgent line gets longer to find a slot |
| budget | 9 lines / 24 s, 4 / 10 s | the room may be busy but not a machine gun |
| queue cap | 6 | over-full: the newest low-priority line goes |
| quiet after bell | 3.2-5.0 s | the call lands before anything else is said |

Priority tiers that worked: bell 10 · match end 9 · wipe / ace / map end / first blood 8 (the urgent
tier) · kill 7 · a save 5 · a ready-bark 4 · a taunt / crowd control 3 · taking a hit or dying 2.

## The opening programme, cue by cue
Countdown 15 s, sim clock parked at 0, announcer at rate 1.22:
`0.5` arena (or the score line on later maps) · `4.4` your team by name · `9.2` their team · bell at
`15.0` · the bodies answer at `15 + 5.6` and `15 + 9.0` (those two ride the match clock). The worst
case is a five-a-side lineup: "In the corner for the challengers: A, B, C, D, E." is ~74 chars, i.e.
~5.0 s at 1.22 — so it needs the 9.2 slot, and the bell still preempts the tail if it runs over.
A short tier (1v1) leaves ~2 s of anticipation silence before the bell, which reads well.

## The probe that tunes the cue times
Load the modules in a `vm` with a `window` global, build the intro candidate lines for real lineups,
and print `est(text)` beside each one plus the simulated timeline the director produces. Ten lines of
script beats guessing at cue times. Then delete it — scratch probes must not ship.

## The assertions (each one caught a real defect)
1. **No overlap**: for every pair in the accepted log, `start >= previous.end`. One voice at a time.
2. **The beat**: `start - previous.end >= 0.9` for ordinary lines; exempt urgent lines and any line
   the previous one was cut for.
3. **Named before the bell**: every competitor's name appears in some accepted line before the bell
   line starts. (This is what catches a programme that overruns its countdown.)
4. **The bell is last and on the clock**: the final accepted line of the programme is the bell, inside
   a +/-1.5 s window of the promised bell time.
5. **The silence**: the first line accepted after the bell starts >= 3.2 s after the bell *ends*, and
   the programme does resume (something is said after the window).
6. **No machine gun**: no more than N lines start inside any 10 s window.
7. **Most offers never said**: spoken / offered stays well under 1 — if every offer is spoken the
   arbitration is not working. 25-30% is a healthy broadcast.
8. **Both classes get a turn**: the booth and the bodies both appear in the accepted log.

## Reading a failure
- Bell late or missing -> the programme overruns the countdown: measure the lines, raise the read rate,
  lay cues against the worst case. Names missing from the pre-bell set is the same defect.
- Silence shorter than promised -> the window was anchored to the cue instead of the line's end.
- One class starved -> no alternation rule, or one class's priority is simply higher everywhere.
- Overlaps -> something is speaking outside the director (a legacy direct call left in the shell).
