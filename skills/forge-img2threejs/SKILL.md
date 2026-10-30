# FORGE IMG2THREEJS

Rebuild the object in a reference image as a **code-only, procedural Three.js model**.
This is reconstruction-by-code, not photogrammetry, mesh extraction or a downloaded art pack.

## Installed source

```text
<FORGE_DIR>\tools\img2threejs
Version: 0.1.1 repo / 2.0.0 skill
Licence: Apache-2.0
Runtime: Node >=18, Python >=3.10, Git
```

The official `SKILL.md`, `docs/`, `forge/` gates and `scripts/` are in that folder.
No host installer was run; Codex/opencode/Hermes skill directories were not modified.

## When to use

- a reference image shows a prop, vehicle, machine, building or character
- the target is a web/Three.js scene and a procedural model is acceptable
- the object is hard-surface enough for code geometry (blockout → forms → materials)

**Not for:** photoreal scans, organic characters needing a full rig, or an exact topology copy.

## Pipeline

Official staged pipeline:

```text
blockout → structural → form → material → surface → lighting → interaction → optimization
```

Each stage has a deterministic gate; vision review corrects before the next stage. Read:

```text
tools/img2threejs/SKILL.md
tools/img2threejs/docs/ARCHITECTURE.md
tools/img2threejs/docs/INSTALL.md
```

## Forge rules

- Record the reference image source and licence; a reference is not an asset licence.
- Keep the generated `.js` code and a screenshot of the final render.
- Run the repo's quality gates; do not accept a first blockout as finished.
- Verify in a real Three.js scene at the target scale, with lights and camera.
- Export a GLB only if the target needs it; the point of this tool is editable code.
- Do not copy a branded/patented object design you do not have rights to.
- Do not claim a photoreal or scan result.

## Forge handoff

1. **Web Worker** supplies the reference and target scale.
2. **Technical Artist** runs the staged sculpt and gates.
3. Record stage outputs, gate results and final render path.
4. Integrate the generated code into the project scene; verify controls/collision.
5. If a GLB is required, optimize it with `forge-gltf-optimize`.

## Local checks

```powershell
node <FORGE_DIR>\tools\img2threejs\bin\img2threejs.mjs --help
node <FORGE_DIR>\tools\img2threejs\bin\img2threejs.mjs doctor
C:\Python313\python.exe <FORGE_DIR>\tools\img2threejs\forge\next.py --help
```

The CLI `install`/`doctor` manages **agent host skills**, not Forge's own loader. Do not run
`install` unless the operator explicitly wants the skill linked into Codex/opencode/Hermes.
