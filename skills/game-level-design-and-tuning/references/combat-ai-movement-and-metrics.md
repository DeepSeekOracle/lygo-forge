# Auto-fighting units: movement, collision and the metrics that prove them

For sims where units pick their own targets and hold their own ground, stepped headlessly in Node over the
real engine (see also `references/pacing-measurement-probes.md` for throughput-style measurements).
This file is about the two questions that eat the most time: *why is that body not moving*, and *how do I
prove the styles/fixes actually changed behaviour*.

## Instruments: add them at spawn, and read them from the harness
Per-body counters, reset per match, written by the think loop:

| field | what it counts |
|---|---|
| `blockedT` / `blockedWorst` | continuous time the body wanted to move and got <45% of its requested move; and the longest single stretch |
| `goalNow` | at the last think, did it have a destination (goal or a slide in progress) |
| `stuckS` / `stuckWorst` | sampled every 2 s: run length where `goalNow && blockedT > 0.4 && netDisplacement < ~26 px` |
| `engageSum` / `engageN` | mean fighting distance |
| `meleeT` | seconds inside ~1.6 tiles of the target (the "in contact" share) |
| `dClose` / `nClose`, `dFar` / `nFar` | distance samples while badly hurt (<50% hp) and while healthy (>75%) |
| `recoils`, `retreats`, `stepBack` | disengagements, health retreats, panic steps |
| `squishPicks` / `picks` | share of target picks that went to the enemy with the least health |
| `healDone`, `dmgDone`, `uses` | healing per body, damage per body, which moves ever fired |

Exclude summoned/token bodies from every style bucket — they inherit a default style and outnumber the real
units, so a healthy style reads as broken (a "rush" bucket that was almost all summons). Same rule for any
coverage assert over a plan drawn up before the fight: a unit summoned or revived after the plan cannot be
in it, so exclude tokens and state the tolerance rather than reporting arithmetic as a defect.

**Sample the doctrine in its own units.** A style table written in fractions of each unit's own reach
(`band: 0.86` = hold at 86% of your reach) cannot be checked with a fixed pixel threshold: 62 px "in
contact" / 150 px "backing off" measures the unit's REACH and calls it its STYLE, so a long gun scores as
retreating for standing exactly where its doctrine told it. Keep reach, the band the engine actually aimed
at, how often the unit was there, and the mean error in units of its own reach — and record the aim band at
the one place the engine computes it (stash it on the body) rather than recomputing a second opinion in the
census. Remember too that the mean distance is dominated by the APPROACH: an at-band share of 40-70% with a
mean at 2x the band is a unit *walking in*, so a claim about standing off wants the share (or a
time-to-contact measure), never the mean.

## The metric definition matters more than the fix
`blockedT` alone is not "snagged on the scenery": it also counts a body cornered and killed while fleeing,
a body waiting inside its own crowd, and a holder strafing into a wall. Define the counter as the player
would describe the complaint — with somewhere to be, pressed on stone, and no net progress over a window.
Report the **average** (the score for the fix) and the **worst single run** (the next finding) separately.

## Four states that freeze a body
1. **Already inside geometry.** A per-axis test that requires a fully clear destination refuses every move,
   including the one that would free it. Fix: penetration-based movement — allow a move when it does not
   increase how many collision corners are in stone.
2. **Pinned by its own crowd.** Uncapped separation can exceed a slow body's walk speed. Fix: clamp the
   separation contribution to ~0.45 of the body's own walk speed.
3. **Decision flicker.** A line-of-sight test re-evaluated every tick alternates the heading and the body
   walks on the spot. Fix: hold the pathing decision for ~0.5 s.
4. **Invalid destination.** A retreat point outside the map, or one that collapses onto the body. Fix:
   clamp inside the arena, and make "nowhere to run" mean turn and fight.

Plus the leash trap: a leash from the team centroid gives a lone unit its own spawn as "home" (it walks
back forever — seven inert 1v1s with zero damage on both sides), and a return-to-centroid piles the whole
team onto one tile. Gate on a living ally, and return to the ring point on the body's own bearing.

## The team layer (a squad brain over the unit brains)
A tasking layer is what turns a dozen styles into a team. Keep it in its own file so the unit engine stays
execution-only (it decides; the engine walks and casts). Shape that worked:
- **One team clock** (~0.28 s) holding: the called target and the reason for it, the team and enemy
  centroids, the axis between them, a rally point behind the line, the front/back split by range, the
  most-wounded body, live counts, an hp-share, and **the hp tilt** (mine minus theirs) — the tilt is what
  gates regrouping, not the head count. Every unit brain reads that one record; nothing else coordinates.
- **One task per unit per decision**, from a small named vocabulary (advance · press · flank · hold · choke ·
  screen · aid · rally · withdraw · overwrite · bait). Store it on the body (`task`, `taskWhy`,
  `tk{task: count}`, `taskRun`) so the HUD chip and the harness read the same fields — the spectator sees
  what the checker asserts. Print the whole vocabulary's usage; a task that never fires is dead doctrine.
- **Preference with a reach cap**: each style's `prefer` (weakest / clump / protect / nearest) may override
  the team call only within reach of the line, else the squad dissolves into private duels.
- **Styles are a table of numbers** (`band, retreat, leash, strafe, commit, panic, prefer, brave, flank,
  screen, aid, wound`) with per-unit overrides carried on the roster as `style` + `tune` + a flavour line —
  one row per style, never a branch per unit. The build step must pass all three onto the built unit or the
  brain and the UI both see none of them.
- **Sample the axes inside the decision function** (stand-off, in-contact, backs-off, weak-pick, on-call)
  so behaviour claims are backed by the sim's own numbers rather than the table's intent, and keep counters
  for support that lands on others (`healOut`, caster !== target) apart from self-healing.
- **One global silence rule sits above the whole task vocabulary.** Stamp the last time any blow landed
  anywhere (one line in the funnel where hp is deducted) and, after ~12 s with no blood, return an
  unconditional press from the top of the decision function — ahead of withdraw, leash and hold. Each of
  those orders is right on its own and their sum is the match where nobody fights: a whole battle ending
  with no damage dealt by either side and nobody down, which the harness counts and which appeared in about
  1 battle in 90. Verify it as a count over 90+ matches (0 such battles), never as one replay.
- Firing order inside the decision: aid for a wounded ally first, then break-contact, then screen/flank,
  then hold/overwrite in band, then regroup, then choke, then press as the default. The default must be the
  "close on your band" branch, never a hold.

## The pre-stage: an opening layer over the planner
A second layer, in its own file, that owns the first seconds of a match — the formation, the march, the
opening push — and then hands every unit back to its own brain. The coupling is one hook: the planner asks
the layer FIRST and returns a non-null plan whole, so neither file has to know the other exists. What
worked, and what bit:
- **Shape → posts → march → opening → release.** The layer picks a shape per side from composition (four
  fists do not stand in a shield line) with a temper bias off a seeded rng; gives every unit a post on the
  axis between the two starting lines, **latched once** (a formation that re-aims every frame is a rumour);
  walks them there under the countdown; then releases waves front → mid → back, claims every enemy, and after
  ~9 s or the first death returns null so the unit's own style fights the rest.
- **The layer walks its own bodies.** Do not ask the planner to march them: a body on its own mark with
  nothing in reach satisfies none of the plan preconditions (no target, no band, none of the doctrine it
  trusts), so the planner returns before moving anything and the pre-stage reads as frozen while the
  announcer talks. Move the unit directly at ~90% of its walk speed and let the planner take over at the bell.
- **Signed offset tables are a trap — assert the geometry you mean.** Rows were signed (0 = the front line,
  negative = behind) and the post maths subtracted them again, so every back rank landed *in front* of the
  front rank: invisible in review, caught only by an assertion. Assert against the **axis the side latched at
  its own start line**, never against where the enemy ended up — both sides cross and the numbers are noise.
- **A clock for a later phase starts at that phase's boundary, and no rule may key on one phase string.**
  Wave and release clocks measured from the countdown fired everything the instant the bell rang; and
  `phase === "live"` is one caller's name — a headless run starts in whatever phase it likes, so
  `phase !== "count"` is the portable test.
- **A claim is a job, not a lock, and the specialists pick first.** Assign by need (least-claimed wins) so no
  enemy walks the field unaccounted for, let a unit whose style prefers the wounded keep that instinct inside
  the call, and order the pick queue specialists → wings → ranks: in rank order the marching units take the
  wounds off the board before the specialists arrive, and the style-identity assertions go red — the tell
  that a team call has quietly erased them.
- **A unit jumped by somebody its claim did not cover re-plans the whole side** (count the switches) — the
  hard switch is what makes claims a tactic rather than a script.
- A 1v1 runs the whole process and it barely matters (one post each); the process is for the team fights.

## Seeing a decision mid-match
Whole-match results only show the end state. Build the match, step it in increments, dump the bodies:
`E.newMatch({you, foe}, mode, seed)` -> `S.phase = "live"` -> `E.stepHeadless(deltaSeconds)` in a few
increments -> per body `task`, `plan.target`, `smp`, hp and position, plus the team record. When one sample
stays 0 while a sibling counter climbs, put temporary counters on the exact branch (`sp.dbgEn`,
`sp.dbgHit`) and read them, rather than re-reading the condition and reasoning about object identity —
then delete them along with the probe. Export the stepper and the brain handle deliberately (`stepHeadless`,
`brain()`); both are permanent, and they are what make a mid-match question answerable in one call.

## Probe hygiene
Write throwaway probes that only *read*. Before concluding anything from one:
- log a raw sample and its type;
- read tile/geometry through the engine's own accessor, never a truthiness test on the value (tiles were
  the strings `"wall"` / `"floor"`, so `tiles[y][x] ? 1 : 0` called every tile solid);
- read fields the engine actually *writes* — a nonexistent field reads `undefined`/null and looks exactly
  like "this body has no target and no goal", which produced two wrong root causes in a row;
- cross-check an "every single one of them is X" result against a second, independent read.

## Harness honesty (the run that proved nothing)
- **A run that produced no output is not a passing run.** A harness started in the background has come back
  with empty stdout and **exit code 0** (the shell printed `stdin is not a tty` and the report never
  printed), and piping it through `grep` hides the same failure by returning 0 from `grep`. Run the harness
  in the foreground and assert on a parsed number from its output — a win rate, a check count — never on
  the exit code. **An empty run is also what contention looks like**: two heavy tools stepped in parallel
  (or a stale background run left alive) push a long run past the caller's timeout, and the killed pipe
  returns exit 1 with no output at all, which reads exactly like a crash. Kill stale runs, re-run alone,
  then debug. When a script needs the text, capture it in the parent process
  (`subprocess.run([...], capture_output=True)`); on Windows `shell=True` is `cmd.exe`, so `$ENVVAR` and
  bash redirection inside that string do not resolve.
- **A fallback record must copy the *reader's* field names.** When a sample object falls back to a default
  literal, that literal must match what the accumulation reads (`{pick, onFocus}`), not the shape the
  writer used (`{bxpick, bxonFocus}`) — the mismatch accumulates `undefined` and the assertion prints
  `NaN%`, which reads as a balance regression and sends you tuning gameplay for a metrics bug.
- **Assert on surviving sides, not on every body.** A body killed in the first seconds never fires a move,
  and a body can win on auto-attacks or healing alone, so "every body fired" is flaky by construction.
  Count a side as acting when it cast *or* dealt damage, and only for sides still standing at the end.
- **A stub context is a subset of the real one.** Check the stub's method list before drawing inside the
  sim: the Canvas stub had no `closePath` and no `measureText`, so `lineTo` back to the start point and a
  character-count width estimate are what keep a headless run from throwing where the browser is fine.
- **Read the failing assertion's own code before theorising about what it means.** A counter named
  `zeroDmg` reads as "a side that went quiet"; its line was `if (!liveAll.some(e => e.dmgDone > 0) &&
  !liveAll.some(e => e.dead))`, i.e. *nobody on either side dealt damage AND nobody died* — a whole match
  that never happened, not a silent side. A session went into hunting the wrong bug (400 sides scanned,
  zero found) while the real one was the global silence case above. When a check fails, open the check.
- Keep the two harness roles separate: one tool asserts *nothing is broken* (structure, NaN, bounds,
  reachability, doctrine — dozens of named checks), a second reports *is it fair* (per-unit win rates over
  a few hundred matches). A balance change is not justified until the second one moves.
- **A tool must load every module the game loads, or it measures a build without the feature.** A balance
  ladder that listed the roster, the engine, the attacks and the brain but not the new pre-stage file went
  on printing healthy numbers for a game where that layer did not exist. After adding a module, grep every
  `tools/*.js` loader list for it — a tool that measures the wrong build is worse than no tool.
- **Read the runner's signature before trusting a section's numbers.** `runHeadless(units, mode, seconds,
  seed)` takes a DURATION IN SECONDS, and sections that only need a built match pass `0.01` — so a
  fight-measuring section handed the same tiny value reports the setup instead of the fight (`0 releases`,
  `0.00s` first contact, `0 openings measured`), which reads exactly like the feature being broken and cost
  a session three hunts for non-bugs.
- **Key a per-instance tally by identity, never by a field you have not verified.** A claim tally keyed on
  `u.id` (units carry their kit id at `u.b.id` — there is no `id`) made every key `undefined`, so each unit
  read "nobody has this one" and an entire side claimed the same enemy. Use a `Map` keyed on the unit. The
  symptom to recognise is "everything picked the same one".

## A blow that deals nothing must say so, and the match must count it
A spectator cannot tell a miss from a missing number, so a zero-damage path that prints nothing reads as an
attack passing through the target. Label every one, and keep counters so the rates become numbers:
- veil/accuracy miss -> `miss` (an explicit `sure` flag bypasses the roll for undodgeable damage);
- armour eats the blow -> `block`, and label weak hits too, not only blows above the old damage floor;
- a shield absorbs the whole remainder -> `ward`;
- an aimed projectile reaching `life <= 0` or leaving the map with no `landed` flag -> `miss` at its last
  position (a lob is aimed at ground and legitimately lands, so exempt it).
Two traps. A damage-over-time tick enters the funnel with a **null attacker** and is silent by design
(`if (!opts.dot)`), so any new text or colour call needs an `if (src)` guard and a warded tick must stay
quiet. And an added early return must keep the funnel's arithmetic exactly — a `<= 0.5` cut where rounding a
0.5 remainder had always dealt 1 is a real balance change; the structural harness caught it as one assertion
flipping (the knife-target metric moved 78% -> 73%).
Telemetry shape that worked: one object per match (`{melee, shots, blocks, wards, whiffs}`), incremented at
the funnel's own zero exits and at attack spawn, printed by the behaviour tool. Measured on a shipping
build: 40 warded blows across 20 headless battles, and 299 blows warded in one 87-second live 3v3 — i.e.
nearly every basic attack aimed at a shielded body looked like nothing happening. Live verification: drive a
real match at speed, read the telemetry twice, and sample the short-lived on-screen labels between reads.

## Proving a behaviour change, and reverting one
- **Census the reason string, not just the task.** Store a human-readable reason on every decision record
  and count seconds per reason across matches; it is the only proof that a tactic fired rather than being
  written, and it reads like the unit's own thoughts (`baiting the shot 1844s`, `taking the reload 6640s`).
- **Activity is not behaviour, and behaviour is not outcome — judge a change by the middle one.** Approach-discipline variants that each owned thousands of
  decision-seconds left a controlled 144-fight set at 34.0% -> 33.3% -> 30.6% wins: those moved nothing but
  *activity*, and were reverted. A variant that moves a *behaviour* metric (time to contact, seconds spent
  closing on a loaded gun, stuck time) is kept as a correctness fix even when the win rate stays flat, and
  must never be written up as a balance gain: the intercept below left 216 duel win rates flat — 35.6% vs
  36.6%, both intervals 30-43 — while cutting shots met at a loaded gun 15% -> 12% and gunwalk 48 s -> 39 s,
  the same direction in two independent samples. Quote the metric that moved AND the one that did not. Revert
  on activity, keep the instrument, and look for the structural cause (a short-reach body duelling a
  long-reach one loses to *reach*, and near-equal speeds mean no amount of leading closes the gap).
- **Load both builds side by side when the sim owns the RNG.** Two runs of one build differ, so a
  sequential A/B measures noise: pull the committed file in (`git show HEAD:<path>`) beside the working tree
  in one process, seed the scenario's own draws, and quote per-body rates.
- **Swap exactly one file, and judge the delta against an interval.** Give the behaviour tool one
  `--<file>=<path>` override per swappable file (an engine flag as well as a brain flag) so a before/after
  differs in one file and nothing else, plus a `--only=<unit>` filter to run a single unit against a fixed
  set at real resolution (a per-row rate over one fight is 0% or 100% and says nothing). Print the 95%
  interval on the summary: at n≈180 the standard error on a 34% rate is 3.5 points, so an effect under ~7
  points is a coin toss wearing a number. The honest write-up of a null result is "the mechanism fired and
  the outcome did not move" — with the census as the evidence that it fired.
- **Measure the tool's own noise floor by running the IDENTICAL build twice.** Two runs of the same
  400-match ladder disagreed by up to 18 points on one unit (mean 7.3) — the printed 95% interval
  understates the real run-to-run spread, so a single run cannot resolve a smaller per-unit move. Re-run the
  same build twice before claiming any delta, and treat an assertion that flapped FAIL→PASS on identical
  code as a defect in the *test* (these census sections draw teams with unseeded `Math.random`), wanting a
  bigger sample — never a looser threshold.
- **Attribute a new layer by silencing it in memory, not by editing shipped code.** A flag in the checker
  that nulls the layer's own hook (`<layer>.planFor = () => null`) before the census is a cheaper, honest
  A/B than a file swap: 60 matched fights each way put the field at 58% of its doctrine distance with the
  layer and 53% without it, and the layer that *looked* like the cause of a movement complaint was
  measurably the thing improving it.
- **A stale threshold is re-derived from its claim, never loosened to pass.** A flat "killers take their own
  target 25% of the time" floor predated a layer that deliberately makes teams more disciplined, so it began
  flapping; the claim it actually makes is a *ratio* — killers behave differently from the marching line —
  and that held at 2.4x (24% vs 10%). Restate the ratio, set the floor to what the claim needs, and say why
  in the assert message. Bending a number to make a check green, and leaving a floor that no longer
  describes the design, are the two wrong answers.
- **Seed the gate before asserting anything inside it.** These census sections draw their teams with unseeded
  `Math.random`, which is why one identical build reads 24% on one run and 22% on the next. Install a PRNG
  into the context before the modules load, expose `--seed=N` to sample another field, and leave the balance
  ladder random on purpose: a gate exists to gate, a sampler exists to sample. Verify by reading the same
  figure on two runs. Keep it inside one tool call as well — pick the sample per section (a structural
  assertion rides half the battles; a clocked mean does not) and never background the run.

## Speaking the fight: commentary, bubbles and voices
Auto-fighting sims are usually *watched*, and the watcher has to be told what happened as it happens.
- **The sim emits events; the presentation layer only words them.** `pushTalk(kind, who, other, hot)` /
  `pushCast(kind, vars)` from the engine, and a separate module holding the lines (per-kind pools, personal
  lines per unit, templates that interpolate both bodies' real names). Adding personality is then adding
  templates, never a branch in the engine.
- **Drain the talk by a monotonic sequence number.** The log is capped, shifted and cleared per match, so
  the UI keeps its own cursor on a `seq` the sim never resets; indexing into the array instead replays
  lines when it shifts and skips lines when it is cleared.
- **Whitelist the announcer's event kinds and assert it.** A line whose kind is not in the sim's emit set is
  commentary nobody earned — the assert caught 106 such lines the day two new event kinds (`edge`, `ace`)
  were added on the engine side and the whitelist was not kept in step. Also assert that a death call names
  the fallen body, every time (72/72).
- **Re-anchor every bubble to its speaker each frame** — in the decay pass *and* the draw pass. A bubble
  positioned once at creation is left behind the moment the body walks or blinks (measured: 7,887
  off-target frames, zero on-target).
- **Prove text-to-speech by counting utterances, not by reading the code.** Wrap `speechSynthesis.speak` and
  count the calls with the voice/pitch/rate each line used (a healthy fight handed the engine ~28 lines in
  10 s at 8x). Voice identity is the per-character pattern — system voices plus a per-unit pitch/rate, with
  novelty voice names filtered out and the announcer given a deep one — not an installed voice catalogue.
  A zero count sampled just after a match ended means no event arrived in that window: re-trigger one
  before calling it a bug.

## What to expect after the movement fixes
Mean stuck time per body fell 0.66 s -> 0.06 s, and zero-move / zero-damage battles went to 0 (an earlier
unit bug had left kiters fleeing the whole arena, and solo leashes had parked bodies at spawn for the
whole match). The last long single run in 300 matches turned out to be state 1 again — a body knocked into
the border wall with its corners inside stone, walking along the wall instead of out of it — and the
penetration rule plus an `inStone` guard on the wall-slide closed it (worst single run fell to ~2 s). A
residual that survives a whole class of fixes usually means one of the four states is still reachable by a
path you have not instrumented: re-probe it, do not assume the class is closed and do not call it noise.
The same instruments double as the style assertions — see the combat-AI section of SKILL.md.

## Interception: arriving at a target that is leaving
- **Aim at where the target WILL be, from a velocity nobody has to report.** Walking at where it *stands* is
  a step behind forever, and against a longer-reach unit that backs away the chaser never arrives at all
  (the tell is a reason census full of `closing on X` against somebody who is leaving). Measure each body's
  velocity from its own last two positions instead of having each movement path report it — walking,
  strafing, knock-backs and dashes are then all covered, at the cost of one frame of lag.
- **Lead time is `distance / own speed`, capped.** Look ahead by roughly how long the walk will take, never
  further.
- **A unit inside its own swing must not lead.** Leading a target you can already hit turns a knife fight
  into two bodies orbiting each other: gate the lead on being outside `strikeReach + ~10`.
- **Clamp the lead OFFSET in length, not only the lead time.** A blink, a dash or a knock-back is one
  enormous frame of "velocity", and carrying it forward sends the aim point off the map. Cap the offset at a
  little over the unit's own reach so the aim can move *along* the target's line but never be flung down it.

Measured on the shipping build: 216 duels a side, win rate flat (35.6% vs 36.6%), shots met at a loaded gun
15% -> 12%, gunwalk 48 s -> 39 s, same direction in two independent samples. A behaviour change, not a
balance win — write it up as such.
