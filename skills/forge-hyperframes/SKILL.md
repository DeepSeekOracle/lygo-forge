# FORGE HYPERFRAMES

Write HTML/CSS and render deterministic MP4/WebM video. No React requirement, no per-render fee.

## Installed

```text
CLI:      hyperframes 0.8.188 (global)
Licence:  Apache-2.0
Runtime:  Node 24, FFmpeg, headless Chrome
Verified: `hyperframes check` → 0 errors, 0 warnings; WCAG 5/5; 1 expected static-motion warning on blank
```

Telemetry is on by default; disable with `hyperframes telemetry disable`.

## Commands

```powershell
hyperframes init my-video --non-interactive
cd my-video
hyperframes check
hyperframes render
hyperframes preview
hyperframes snapshot
hyperframes compositions
hyperframes timeline
```

## Composition model

- HTML with `data-composition-id`, `data-start`, `data-width`, `data-height`.
- Clips use `data-start`, `data-duration`, `data-track-index`.
- Seekable animation via GSAP/CSS/Lottie/Three.js/WAAPI adapters.
- Renderer seeks each frame in headless Chrome, encodes with FFmpeg.

## Forge rules

- Use for launch clips, feature walkthroughs, trailers, UI motion and captions.
- Keep the composition source; do not ship only the MP4.
- Run `check` before `render`; fix lint/runtime/contrast errors.
- Use a real 16:9 or 9:16 composition; do not letterbox a vertical clip.
- Give audio a track and verify loudness; use Forge Audio Studio or licensed music.
- Do not use third-party footage/music without a licence.
- Keep the render deterministic: no wall-clock animation, no network-dependent assets.
- Record resolution, duration, seed if any, source path and render command.

## Verified local check

The blank default project:

```text
Lint:     0 errors, 0 warnings
Runtime:  0 errors, 0 warnings
Layout:   1 warning (nothing moves; expected for blank)
Contrast: 5/5 WCAG AA
Check:    passed
```

## Acceptance

- `hyperframes check` passes with no errors
- MP4 plays end-to-end
- audio present and not clipped
- captions legible
- no missing assets
- source + render command recorded
