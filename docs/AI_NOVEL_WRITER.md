# AI-Novel-Writer — Forge narrative pointer

**Source:** https://x.com/bkdgiffug/status/2114603683593793654 (verified 2026-10-27)
**Repo:** https://github.com/EthanYoQ/AI-Novel-Writer
**What it is:** open-source desktop tool for long-form writing — characters, world, outline, chapters,
revision — with local data and a bring-your-own model setting.

## Where it belongs

The `narrative-designer` role. Not a game build dependency and not an asset source: it produces
`GDD.md` §narrative, `CREDITS.md` copy and in-game text.

## Cautions

- Local files, but **you supply the model** — point it at the LYGO engine, not a paid API.
- Generated prose still needs a human read; the tool's own README says the same.
- Do not let it write lore that contradicts `ART_BIBLE.md` or existing `DECISIONS.md`.
