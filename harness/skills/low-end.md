# Low-End Performance

## Budgets are gates

| Profile | FPS | Resolution | Draw calls | Triangles | Textures | Audio |
|---|---|---|---|---|---|---|
| Web | 60 | 1280×720 | ≤90 | ≤150k | ≤96 MB | ≤12 MB |
| Unity | 60 | 1280×720 | ≤140 | ≤300k | ≤192 MB | ≤24 MB |

These are starting budgets; record the actual measurement in `QA.md`.

## Measure

- Web: Chrome Performance panel, `renderer.info`, frame time percentiles.
- Unity: Profiler, Frame Debugger, Memory Profiler, build size.
- Measure on the **low preset**, at the gameplay camera, after 60 seconds of play.

## Usual wins

1. Remove per-frame allocations.
2. Merge static geometry / batch by material.
3. Cut transparent overdraw and full-screen post.
4. Reduce texture size and use compression.
5. LOD / cull repeated props.
6. One shadow light; bake the rest.
7. Cap particles and audio voices.
8. Defer loading and release unused assets.

## Do not

- Add a new effect to fix a readability problem.
- Ship only on the fast preset.
- Call a lower resolution "optimization" without measuring.
- Trade input latency for visual polish.

## Gate

A profile failure is a **blocker**, not a polish note. Record machine, browser/editor, resolution, and the exact scene.
