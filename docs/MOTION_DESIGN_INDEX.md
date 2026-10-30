# Motion-design skill list — Forge selection

**Source:** https://x.com/Asteri_eth/status/2112956876425941245  
**Decision:** **Selected pointer index. No 20-skill dump, no Claude Code/Opus install.**

The post lists 20 motion-design skill repos. Forge does not need all of them, and most are
Claude Code wrappers for paid Opus pipelines. The following are the only pieces worth keeping as
reviewed references.

## Selected references

| Repo | Licence | Forge use |
|---|---|---|
| [LottieFiles/motion-design-skill](https://github.com/LottieFiles/motion-design-skill) | MIT | timing, easing and choreography for UI/web motion |
| [greensock/gsap-skills](https://github.com/greensock/gsap-skills) | MIT | official GSAP patterns for web games and UI |
| [dylantarre/animation-principles](https://github.com/dylantarre/animation-principles) | MIT | 12 principles as an animation review vocabulary |
| [remotion-dev/skills](https://github.com/remotion-dev/skills) | **unverified** | code-video reference only; no installations until licence is confirmed |

## Forge rules

- Use these as **technique references**, not copied skill packs.
- Re-author motion in the project’s engine; record source/creator.
- Animation Principles is a review checklist, not 144 auto-loaded skills.
- GSAP is subject to its own licence for the runtime; the **skills repo** is MIT.
- Lottie assets need their own provenance; a Lottie skill is not an asset licence.
- Remotion is a separate runtime/licence; do not install or bundle on the strength of this post.
- No Claude Code, Opus 5.5, launch-video monetisation, or paid render pipeline is adopted.

## Disregarded

- Claude Code-only wrappers and “Opus 5.5 pipeline” repos
- paid launch-video/reel playbooks
- 55/144-skill bulk packs without per-skill review
- duplicate motion prompt libraries already indexed by `forge-motion-prompt-library`

## Pointers

- `skills/forge-motion-prompt-library/SKILL.md`
- `docs/OPUS55_PROMPTS.md`
- `docs/LEMO_OPUSCAR.md`

## Installed skill packs (2026-10-23)

- `forge-gsap` — from greensock/gsap-skills core.
- `forge-lottie-motion` — from LottieFiles motion-design-skill.
- `forge-animation-principles` — game-development domain.
- `forge-web-motion` — web-motion-design domain.
- Source repos live in `tools/motion-skills/`; no bulk 144-skill load.
