# FORGE VFD / PHOSPHOR UI

A retro-futurist interface language inspired by vacuum-fluorescent displays (VFD), green/amber
phosphor CRTs, and 1980s industrial terminals. Use it deliberately, not as a blanket filter.

## Tokens

```css
:root {
  --vfd-bg: #050a06;
  --vfd-panel: #0a140d;
  --vfd-green: #64ff9a;
  --vfd-green-dim: #2f8f57;
  --vfd-amber: #ffb43a;
  --vfd-amber-dim: #9a6417;
  --vfd-cyan: #54e6ff;
  --vfd-red: #ff4d4d;
  --vfd-grid: rgba(100, 255, 154, 0.08);
  --vfd-glow: 0 0 6px rgba(100, 255, 154, 0.55);
}
```

One accent (green **or** amber) should dominate; the other is for warnings/status only.

## Type

- Monospace or a technical bitmap font; avoid rounded sans.
- Tight tracking, uppercase labels, tabular numbers.
- Minimum body size 14–16 px; do not use 8 px "for the look" on real controls.
- Use a subtle 1 px outline/glow; avoid heavy blur.

## Layout

- Dark near-black panel; thin 1 px inset borders.
- Grid or scanline overlay at very low opacity.
- Segmented meters, 7-segment numbers, dot-matrix labels.
- Slight panel inset/bevel; no glassmorphism, no soft drop shadows.
- Keep controls rectangular and predictable.

## Effects

```css
.vfd-panel {
  background: var(--vfd-bg);
  color: var(--vfd-green);
  border: 1px solid rgba(100, 255, 154, 0.35);
  box-shadow: inset 0 0 24px rgba(100, 255, 154, 0.08), var(--vfd-glow);
  text-shadow: 0 0 4px rgba(100, 255, 154, 0.55);
}
.vfd-scanlines::after {
  content: "";
  position: absolute; inset: 0; pointer-events: none;
  background: repeating-linear-gradient(
    to bottom,
    transparent 0 2px,
    rgba(0, 0, 0, 0.18) 2px 3px
  );
  opacity: 0.35;
}
```

Keep animation minimal: cursor blink, scan sweep, meter fill. No continuous full-screen flicker.

## Accessibility

- Green-on-black must still meet **4.5:1** for body text; test actual hex values.
- Do not use red/green alone to encode state; pair with text/icon.
- Provide a **high-contrast / reduced-effects** mode that removes scanlines, glow and flicker.
- Respect `prefers-reduced-motion`; stop blinking/sweeps.
- Keep focus rings visible and not swallowed by glow.
- Do not use a CRT curvature shader on real controls; it distorts hit targets.

## Good uses

- terminal/HUD in a retro game
- diagnostic panel, radar, reactor console
- 404/loading page for a technical product
- README/launch art

## Bad uses

- long-form reading pages
- form-heavy checkout/settings
- any UI where scanlines reduce legibility
- copying a branded film UI (e.g. EVA) directly

## Acceptance

- one dominant phosphor color
- body text passes contrast
- reduced-effects mode exists
- no flicker above a comfortable rate
- controls remain usable at 100% zoom
- aesthetic is a deliberate choice, not a filter over generic UI
