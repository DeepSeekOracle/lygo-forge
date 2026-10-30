# ASSET SOURCES — what the Forge may pull from

Intake 2026-10-27. Every URL below was fetched and returned **200** on that date. Licences are
**not** uniform: check the licence of the individual asset, not the site, and record it in
`assets/manifests/assets.json` before the file enters a build.

## 1. 3D model libraries

| Source | What you get | URL | Licence reality | Status |
|---|---|---|---|---|
| **Polyfork** | 2,600+ game-ready **parametric** 3D models (+200/week); glTF, works in Three.js / Unity / Godot / Unreal; parameters for colour, wear, season, state | https://polyfork.dev | free to use; **read their terms** before shipping commercially | recommended |
| **NVIDIA SimReady Assets** | 2,575 simulation-ready models, 472 GB, with **physics settings and semantic labels** — useful when a prop must collide correctly | https://huggingface.co/datasets/nvidia/SimReady-Assets | NVIDIA dataset licence on the HF card | recommended for physics props |
| **Sketchfab** | huge mixed library | https://sketchfab.com | **per-model**: CC0 / CC-BY / paid — never assume | check each |

## 2. 3D → animation / scene

| Source | What it does | URL | Use in the Forge | Status |
|---|---|---|---|---|
| **img2threejs** | reference image → code-only Three.js scene | https://github.com/img2threejs/img2threejs | **already vendored** at `forge/tools/img2threejs` — no download needed | installed |
| **Mesh2Motion** | upload a model, rig it, test walk cycles, export back to Blender — the $0 animation path | https://mesh2motion.org | `forge-blender-worker` animation step | recommended |
| **Motion2MixamoRig** | human motion from video → 3D character | https://github.com/MaxLiu22/Motion2MixamoRig | motion capture substitute | optional |
| **dsh-blender-plugin** | AI tooling inside Blender | https://github.com/sixtysevenlf/dsh-blender-plugin | Blender worker | optional |
| **dioramas** | cinematic 3D web pages (Three.js/WebGL) | https://github.com/blendi-remade/dioramas | reference for title screens | optional |

## 3. Skill / design references

| Source | What it does | URL | Where it belongs | Status |
|---|---|---|---|---|
| **emilkowalski/skills** | design + motion judgement for AI agents, from a Vercel/Linear designer (2.7M installs) | https://github.com/emilkowalski/skills | pairs with `design-ui` and `forge-ui-worker`; **read before** a HUD/menu pass | recommended |

## 4. Spec quality (not assets — process)

| Source | What it does | URL | Where it belongs |
|---|---|---|---|
| **google/elephant-goldfish-model** | two-agent method: *Elephant* writes the design/spec, *Goldfish* inherits no chat history and reviews the spec cold (understanding check, adversarial review, implementation check) **before** code | https://github.com/google/elephant-goldfish-model | `forge\docs\SPEC-REVIEW.md`, QA phase |

## 5. Narrative tooling

| Source | What it does | URL | Where it belongs |
|---|---|---|---|
| **AI-Novel-Writer** | open-source desktop long-form writing (characters, world, outline, chapters), local data, bring your own model | https://github.com/EthanYoQ/AI-Novel-Writer | narrative-designer role; not a game build dependency |

## Per-source detail docs

The Forge keeps one short pointer per source, in the same style as `SIMREADY.md`:

| Doc | Source |
|---|---|
| `POLYFORK.md` | parametric glTF library (2,600+) |
| `MESH2MOTION.md` | rig + walk-cycle pipeline (web tool, not a fetch host) |
| `THREEJSASSETS.md` | Three.js free tier (937 GLBs) |
| `SIMREADY.md` | NVIDIA SimReady Central (OpenUSD, physics) |
| `THREEJS_8_REPOS.md` | img2threejs (installed), Motion2MixamoRig, dsh-blender-plugin, dioramas, video-shotcraft, lemo-opuscar, mg-styles-15 |
| `DESIGN_SKILLS.md` | emilkowalski/skills — design + motion judgement for agents |
| `SPEC-REVIEW.md` | Elephant/Goldfish cold spec review |
| `AI_NOVEL_WRITER.md` | narrative tooling |
| `PISKEL.md` | **local pixel-art editor** (Apache-2.0) at `/pixel/` + import to `assets/_inbox` |
| `RIG_ANIMATION.md` | the animation pipeline itself |

`sources.json` (in `skills/forge-asset-pointer/`) is the machine-readable fetch allowlist — a source
must be registered there, not just documented here, before the asset bot can pull from it.

## Rules for using any of this

1. **Licence first.** No asset enters a build without `{path, kind, source, licence}` in
   `assets/manifests/assets.json`.
2. **Fetch once, store locally.** A build must not depend on a live URL; download into `assets/`,
   then reference the file.
3. **Parametric beats scanned.** A Polyfork-style parametric model you can recolour to the art bible
   is worth more than a textured scan you have to fight.
4. **Physics props:** SimReady models carry collision; use them where collision matters, or author
   colliders by hand and say so.
5. **No `@latest` installs** (see the supply-chain rule in `VERSIONS.json`): pin versions and verify.
6. **Review before code.** Any spec that another agent cannot understand from the files alone goes
   back for a rewrite (Elephant/Goldfish, §4).

## 6. Local tools (vendored, not fetched)

| Tool | Path / route | Use |
|---|---|---|
| **Piskel** | `/pixel/` · `forge/tools/piskel` | pixel sprites, walk frames, icons, UI bits; export → `assets/_inbox` |
| **img2threejs** | `forge/tools/img2threejs` | reference image → Three.js scene |
| **Blender** | `forge-blender-worker` | models, GLB, rigs |
