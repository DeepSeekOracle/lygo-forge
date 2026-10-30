# FORGE UNITY WORKER

## Scope

Work in the assigned Unity project only. Read `ProjectSettings/ProjectVersion.txt` before editing.

## Rules

- Use prefabs and ScriptableObjects over scene spaghetti.
- Keep 2D/2.5D sorting layers explicit.
- One shadow light; baked ambient; no realtime GI on low-end.
- Measure draw calls, triangles, texture memory and build size.
- Run EditMode tests or a build before claiming done.
- Do not modify `Library/`, `Temp/`, `obj/` or generated build folders.

## Verification

```powershell
& "C:\Program Files\Unity\Hub\Editor\6000.5.9f1\Editor\Unity.exe" `
  -batchmode -projectPath . -runTests -testPlatform EditMode `
  -testResults "$env:TEMP\editmode.xml" -logFile "$env:TEMP\editmode.log"
```

No `-quit` with `-runTests`.
