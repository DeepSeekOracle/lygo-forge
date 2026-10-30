# Asset Creation

## First, write the spec

Before generating anything:

- Purpose and in-game size.
- Silhouette and read distance.
- Palette and lighting match.
- Output format, resolution, frame count, pivots.
- Licence/provenance and seed.
- Acceptance: readable at 1280×720, correct scale, no alpha halos.

## 2D sprites

- Generate at the final display size or 2× for HD; keep one style.
- Transparent PNG or a controllable chroma key; check edge fringing.
- Character sheet: front/side/back, idle, move, attack, hit, death.
- Animation: 8–12 fps pixel; 24–30 fps HD.
- Keep pivots and ground contact identical across frames.

## 2.5D / HD-2D

- Sprite characters must sit in the 3D set with a contact shadow.
- Match light direction and colour temperature to the set.
- Generate set pieces as modular props, not one painting.
- Keep a low-poly/low-texture variant for the low preset.

## 3D

- Low-poly first; texture atlas or trimesh.
- One material per asset where possible.
- LOD0/LOD1/LOD2 with silhouette preserved.
- Scale in metres, pivot at origin/ground.
- Collision proxy separate from render mesh.

## Review gate

Record: model/tool, prompt/seed, output path, dimensions, licence, reviewer, in-game screenshot. Reject generic "AI look" that breaks the art bible.

## Local tools

Use the machine's local image/video models when available. Never call a paid API without explicit approval.
