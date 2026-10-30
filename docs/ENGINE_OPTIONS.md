# Game-engine options — Forge selection

**Source:** engine shortlist supplied by Justin, 2026-10-23  
**Decision:** **ASSESSMENT ONLY. No new engine installed.**  
**Forge profiles today:** **Unity** and **Web/Three.js**.

A free engine is not a drop-in Forge capability. Each engine needs a profile, a build/test adapter, asset import rules and a playable smoke scene before it can be called supported.

## Triage

| Engine | Licence | What it is | Forge fit |
|---|---|---|---|
| **Godot** | MIT | Full 2D + 3D engine, editor, GDScript/C#, desktop/mobile/web | **Best new-profile candidate.** Not current; needs a Godot profile + export/test adapter. |
| **Bevy** | MIT / Apache-2.0 | Rust ECS, code-first | **Not now.** No Rust toolchain/profile; good for a future code-first desktop project. |
| **PixiJS** | MIT | Fast 2D WebGL/Canvas renderer | **Web 2D foundation candidate.** Not a full engine; useful for a custom renderer. |
| **Phaser** | MIT | Mature 2D HTML5 framework | **Best web-2D candidate.** Needs a Phaser profile and browser test path. |
| **raylib** | zlib | Minimal C game library | **Prototype/tool candidate.** Excellent for small tools and tests; not a full production pipeline. |
| **GDevelop** | MIT core | No-code/visual event-sheet engine | **Not Forge.** Visual editor workflow is the product; not a headless agent target. |
| **Babylon.js** | Apache-2.0 | Full 3D web engine, WebGPU | **Web 3D candidate.** Closest alternative to the current Three.js profile. |
| **libGDX** | Apache-2.0 | Java cross-platform framework | **Not now.** JVM/Android toolchain and profile absent. |
| **PlayCanvas** | MIT | Web 3D/WebXR runtime + editor | **Web 3D candidate.** Strong for browser 3D; needs profile/adapter. |
| **MonoGame** | MIT | C# cross-platform framework | **Not now.** C#.NET profile absent; Unity remains the C# path here. |

## Recommendation

1. **Do not install ten engines.** One 8 GB machine cannot carry ten runtimes, SDKs and test harnesses.
2. **Keep Forge on Unity + Web/Three.js** until a concrete project demands otherwise.
3. **If the next game is 3D and not Unity:** choose **Godot** first. It is the strongest free full-engine option on this list, but it is a new Forge profile—not a link install.
4. **If the next game is 2D browser:** choose **Phaser**. Use **PixiJS** only if you are building a custom renderer.
5. **If the next game is 3D browser:** **Babylon.js** or **PlayCanvas** are the alternatives to the current Three.js path.
6. **If Rust is a hard requirement:** **Bevy**.
7. **If C# without Unity is a hard requirement:** **MonoGame**.
8. **For tools, prototypes and tiny tests:** **raylib**.
9. **GDevelop and libGDX** do not fit the current agent-driven pipeline.

## If a new engine is added

1. Prove Unity/Web cannot meet the target.
2. Add a Forge **profile** with budgets, tasks, specialists and asset rules.
3. Add a **build/test adapter** for the engine.
4. Keep the engine runtime and project outside the Forge exe.
5. Pass one representative asset + a playable smoke scene.
6. Record the engine version, licence and export targets.
7. Only then call it supported.

## Current support statement

```text
Unity      supported
Web/Three.js supported
Godot      not installed, not a profile
Phaser     not installed, not a profile
Babylon    not installed, not a profile
Bevy       not installed
PixiJS     not installed
raylib     not installed
GDevelop   not installed
libGDX     not installed
PlayCanvas not installed
MonoGame   not installed
```

No paid engine, asset store or subscription is required by this assessment.

## Pointers

- https://github.com/godotengine/godot (MIT)
- https://github.com/bevyengine/bevy (MIT / Apache-2.0)
- https://github.com/pixijs/pixijs (MIT)
- https://github.com/phaserjs/phaser (MIT)
- https://github.com/raysan5/raylib (zlib)
- https://github.com/4ian/GDevelop (MIT core)
- https://github.com/BabylonJS/Babylon.js (Apache-2.0)
- https://github.com/libgdx/libgdx (Apache-2.0)
- https://github.com/playcanvas/engine (MIT)
- https://github.com/MonoGame/MonoGame (MIT)
- Forge profiles: `harness_data.py`
