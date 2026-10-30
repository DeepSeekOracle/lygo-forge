# Design skills for agents — Forge pointer

**Source:** https://x.com/RoundtableSpace/status/2115084854358688030 (verified 2026-10-27)
**Repo:** https://github.com/emilkowalski/skills
**Author:** Emil Kowalski (ex-Vercel / Linear designer)
**What it is:** a free skill pack teaching agents design and motion judgement — when to animate, how
long, what easing, and when animation is the wrong answer.

## Where it belongs in the Forge

- pairs with `design-ui` and `forge-ui-worker` for HUD, menus and title screens
- read **before** a UI pass, not after: the useful part is the judgement about restraint
- complements `game-ui-icons` (asset production) — this is about *behaviour*, not art

## How to adopt it

1. Clone or read the repo; it is markdown skills, no install required.
2. Do not bulk-copy it into `forge/skills` — select the motion/design entries a build actually needs
   and note which ones were used in `DECISIONS.md`.
3. If an install command appears upstream, pin a commit rather than `@latest`.
