# Unity Game Building

## Project setup

- Unity **6000.5.9f1** on this machine.
- URP for 2D/3D; built-in only if the project already uses it.
- One scene per major state, or additive scenes with an explicit bootstrap.
- Prefabs and ScriptableObjects over scene references for content.
- Source control: ignore `Library/`, `Temp/`, `Logs/`, `obj/`, `Build/`; commit `Assets/`, `Packages/`, `ProjectSettings/`.

## 2D

- Sprite atlas + compression before content scale.
- Tilemap + composite collider.
- URP 2D renderer; one shadow/light budget.
- Pixel Perfect Camera for pixel art.

## 2.5D / HD-2D

- Sorting layers explicit: Background, Set, Characters, Foreground, VFX, UI.
- Camera constrained; do not let the editor free camera define the look.
- One shadow light; baked ambient.
- Post volume with a low preset: DOF/bloom off, 1× render scale.

## 3D

- Static batching, GPU instancing, LOD groups.
- Occlusion culling after blockout.
- One shadow light; baked lightmaps.
- Target 60 FPS at 1280×720 on the low preset.

## Verification

```powershell
& "C:\Program Files\Unity\Hub\Editor\6000.5.9f1\Editor\Unity.exe" `
  -batchmode -projectPath . -runTests -testPlatform EditMode `
  -testResults "$env:TEMP\editmode.xml" -logFile "$env:TEMP\editmode.log"
```

Do not pass `-quit` with `-runTests`.

Build WebGL with compression fallback if the host lacks COOP/COEP. Measure build size and first-load time.

## Assets

- Import only licensed assets; keep the licence in `ASSET_PLAN.md`.
- Set texture max size and compression per platform.
- Never ship asset-store samples or ripped game files.
