# Godot — installed standalone

**Source:** engine shortlist supplied by Justin  
**Version:** 4.7.2 stable  
**Licence:** MIT  
**Path:** `<FORGE_DIR>\tools\Godot\Godot_v4.7.2-stable_win64.exe`  
**Decision:** **Installed as standalone engine. Not a Forge profile.**

## Verified

```text
Godot_v4.7.2-stable_win64.exe --version
4.7.2.stable.official.ed1daf0bf
```

## What this does and does not mean

- Godot itself is installed and runnable.
- Forge cannot claim Godot project support yet. That needs:
  - a Godot profile in the harness
  - project import/export rules
  - build/test adapter
  - a playable smoke scene
- Forge’s current supported profiles remain **Unity** and **Web/Three.js**.

## Use

- Open a project locally with the editor.
- Test small 2D/3D scenes and exports.
- Do not route Forge jobs to Godot until the profile exists.
- Keep project files outside the Forge exe and inside `<PROJECTS>`.

## Smoke test

1. Create a blank Godot project.
2. Add a 3D/2D scene with one moving object.
3. Run the project locally.
4. Export a Windows build.
5. Record the Godot version and export preset.
6. Only then start the Forge profile work.

## Pointers

- https://github.com/godotengine/godot
- `docs/ENGINE_OPTIONS.md`
- `harness_data.py`
