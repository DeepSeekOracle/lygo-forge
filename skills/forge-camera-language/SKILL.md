# FORGE CAMERA LANGUAGE

Use precise camera-move names instead of vague “more cinematic” prompts. This works for video
generation prompts and for planning Three.js/Blender shots.

## Framing

- **Extreme wide / establishing** — place and scale
- **Wide** — subject + environment
- **Medium** — waist-up; dialogue/action
- **Close-up** — face/object detail
- **Extreme close-up / macro** — texture, eye, mechanism
- **Over-the-shoulder** — conversation, pursuit
- **Low angle** — power, threat
- **High angle** — vulnerability, map-like view
- **Dutch angle** — unease, action
- **Top-down** — tactical/geometric view

## Moves

- **Dolly in / push in** — physically approach; increasing intensity
- **Dolly out / pull back** — reveal context, isolation
- **Track / truck** — move parallel to the subject
- **Crane up/down** — vertical reveal
- **Pedestal up/down** — raise/lower the camera without tilting
- **Pan** — rotate horizontally on a fixed point
- **Tilt** — rotate vertically on a fixed point
- **Orbit / arc** — circle the subject
- **Handheld** — controlled instability
- **Steadicam** — smooth following movement
- **Whip pan** — fast pan with motion blur; transition/impact
- **Zoom in/out** — change focal length, not position
- **Dolly zoom / Vertigo** — move and zoom oppositely; disorientation
- **Rack focus** — shift focus between planes; directs attention
- **Follow focus** — keep a moving subject sharp
- **Tracking shot** — follow a moving subject
- **Push-by / pass-by** — camera passes an object into frame
- **Reveal** — start on a detail, widen to the whole
- **Crash zoom** — sudden zoom for comedy/impact

## Light and lens language

- **Shallow depth of field** — isolate subject
- **Deep focus** — everything readable
- **Anamorphic flare** — wide-screen highlight streak
- **Practical light** — visible in-world source
- **Rim light** — separate subject from background
- **Silhouette** — shape over detail
- **Golden hour / blue hour** — time-of-day palette
- **Hard light / soft light** — edge definition vs wrap

## Shot-planning rules

1. One primary move per shot; a second move must have a reason.
2. State **start frame → end frame**, not just the move name.
3. Give the subject a clear screen direction; keep it consistent across cuts.
4. Use a cut, not a move, when the move would take too long.
5. For 3D, block the camera path and test it at the target resolution.
6. For video prompts, specify **framing + move + speed + subject + end state**.
7. Do not stack “orbit + dolly + zoom + handheld” in one prompt; it usually produces mush.
8. Check the move survives the model’s clip length; split long moves into shots.

## Prompt template

```text
[shot size] of [subject] in [environment].
Camera: [move] at [slow/medium/fast] speed, starting [start state] and ending [end state].
Lens: [wide/normal/tele], [shallow/deep] focus.
Light: [source/quality/time].
Action: [one clear action].
No text, no watermark, no extra limbs.
```

## Acceptance

- the shot has one readable move
- start and end states are both visible
- the subject stays on-screen and in focus where intended
- no accidental Dutch angle or horizon drift
- the move fits the clip length
- camera terms are recorded in the shot note

## GrokFilm reference

- https://grokfilm.app — cinematic technique index (camera/light/cut).
- No visible reuse licence for examples/prompts; study and re-author, never copy prompts or reels.
- Details: `docs/GROKFILM.md`.
