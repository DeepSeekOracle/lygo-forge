# Tuning opponent AI that drives a course

An opponent driven through the same physics as the player (same engine, same grip limits, same assist)
is what makes a rival lap a *real* lap - if the AI can get round, the course is drivable, and a rival that
beats the player beat them with the same machinery. The cost is that every complaint about the AI is a
complaint about tuning, and the four causes below account for almost all of them.

## 1. The pace multiplier was scaling corner speeds

`want = targetSpeed[ahead] * paceFactor` is the trap. The target speed through a corner is already the
speed the tyres can hold, so a pace of 1.2 asks for 20% more grip than exists. It is invisible in every
easy event (pace 0.9-1.0) and only appears in the hard ones - which is exactly when the owner reports
"the AI crashes a lot".

Scale the boost by how straight the section is, so pace overdrives the straights and leaves the corners
alone:

```csharp
float eff = Mathf.Min(paceFactor, paceCeiling) * cornerCaution;
float t1 = path.targetSpeed[path.IndexAtDistance(ahead)];
float straightness = Mathf.Clamp01(t1 / maxTargetSpeed);      // cache maxTargetSpeed once
float want = t1 * (1f + (eff - 1f) * straightness);

// look further down the road the faster the agent is going: slowing starts BEFORE the corner
float brakeIndex = path.IndexAtDistance(ahead + speed * brakeLookaheadPerSpeed);
want = Mathf.Min(want, path.targetSpeed[brakeIndex]);         // ~1.15 m of lookahead per m/s of speed
```

`Mathf.Min` against the *future* target only ever limits, when the road ahead is slower; it never caps
acceleration out of a corner, because that target is rising.

## 2. Where each agent aims, and how they avoid each other

- **One lane per agent**, spread across the road rather than a shared line: seven lanes at
  `-2.4, 2.4, -1.2, 1.2, 0, -1.8, 1.8` gives every rival its own groove. Do not clamp tighter than the
  road's half-width, or the lanes collapse back onto each other.
- **Per-agent aim distance and corner caution**, or the whole field turns in at the same place:
  `lookaheadBase = 8 + (slot % 3) * 1.6` (8.0 / 9.6 / 11.2 m), `lookaheadPerSpeed = 0.48 + (slot % 2) * 0.10`,
  `cornerCaution = 0.96 + (slot % 4) * 0.018`.
- **Shuffle the skill list.** Fastest-first grids string out into a queue; a mixed grid trades places.
  `{ 0.94, 1.05, 0.89, 0.99, 0.91, 1.02, 0.96 }` around the player's 1.0 reads as racing - some slightly
  quicker, some slightly slower, which is what the owner means by "so they race".
- **Look for the machine in front.** A `SphereCastAll` from the nose (radius ~1.15, distance ~9 m) filtered
  by `GetComponentInParent<CarController>` needs no layer setup: shift the aim point away from the
  blocker's side (±2.2 m, clamped to the road) and lift the throttle to ~0.35, so it is a pass rather than
  a punt. Overlook this and the rivals ram the player.
- **Rejoin mode.** When an agent is genuinely off the line, stop aiming at a lookahead point that may be on
  the far side of the barrier it is leaning on: aim at the line a short distance ahead instead, and cap the
  speed (~60 kph) while rejoining.

## 3. Nearest-point search: window, fallback, and the spacing trap

- Search a window around the last known index (`-20..+36`) instead of scanning the whole course every tick
  for every agent.
- **A windowed search needs a full-scan fallback.** A knocked-wide agent finds nothing close in its window,
  keeps a stale index and drives at a wall forever. Fall back to a full scan when the best distance squared
  is large (> ~400, i.e. 20 m).
- **"Distance to the nearest point" is not distance to the line** on a sparse point cloud: at ~10 m spacing
  a machine dead on the line still reads ~5 m away. Measured, a 5.5 m threshold produced 97 off-line
  triggers for 10.4 s of real off-line time - the flag chattering, not the agents wandering. Set the
  threshold above the spacing (~9 m) and add hysteresis (enter at 9 m, leave at 0.65x that): 0 triggers over
  a 48 s run is then achievable while still catching a genuine excursion.

## 4. Instrument before tuning

Expose the counters on the agent and read them from a probe. A claim that "the AI crashes less now" is
worthless without a number, and these cost nothing at runtime:

```csharp
public float OffPathTime { get; private set; }
public int OffPathIncidents { get; private set; }
// per tick: off = _offPath ? lineDist > rejoinDistance * 0.65f : lineDist > rejoinDistance;
//           if (off && !_offPath) OffPathIncidents++;
```

## 5. The fixed-scenario probe

Reproduce the scenario the owner complained about, park the player's machine, and sample after ~50 s: the
hardest event's field size and skill, its lap count, started directly (bypassing the menu),

```csharp
var grid = UnityEngine.Object.FindAnyObjectByType<AIGrid>();
var mgr  = UnityEngine.Object.FindAnyObjectByType<RaceManager>();
grid.SetRivalCount(7); grid.SetPaceScale(1.20f);   // the career-final ask
mgr.totalLaps = 6; mgr.StartRace();                 // leaves the menu state directly
```

then log per agent: speed, incidents, off-line seconds, and the **field spread** (max progress minus min
progress). Spread is the "are they racing or queuing" metric - 91 m of spread at 93-101 kph is a field
running its own lines; a near-zero spread is a train.

Measured on one such field (7 rivals, pace 1.20, 6 laps, player parked): **97 incidents / 10.4 s off line
before; 0 / 0.0 s after**, spread 91 m.

## Limits of this verification

- The player's machine was parked, so agent-to-player contact is untested by it: the avoidance code covers
  it, but only someone driving and being passed proves that part.
- The counters measure distance from the racing line, so an agent that scrapes a barrier while staying
  within the threshold is never counted.
