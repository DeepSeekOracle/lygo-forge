# Forge Release Packager

Create a repeatable release ZIP with a SHA-256 manifest, build info, credits and licence
skeleton.

## Command

```powershell
C:\Python313\python.exe <FORGE_DIR>\pipeline\release.py `
  --project <PROJECTS>\demo `
  --build <PROJECTS>\demo\build\win `
  --version 0.1.0 `
  --out <PROJECTS>\demo\release `
  --name "Demo Game" `
  --engine unity
```

Output:

```text
<name>-<version>-windows.zip
BUILD_INFO.json
MANIFEST.json
RELEASE.json
CREDITS.md
LICENSES.md
```

Forge dispatcher brief:

```json
{
  "project": "<PROJECTS>/demo",
  "build": "<PROJECTS>/demo/build/win",
  "version": "0.1.0",
  "out": "<PROJECTS>/demo/release",
  "name": "Demo Game",
  "engine": "unity"
}
```

Skill: `forge-release`, agent: `release-pack`.

## Required before public release

- [ ] Human playtest completed
- [ ] All assets present in the vault with provenance
- [ ] Every third-party licence in `LICENSES.md`
- [ ] Credits written
- [ ] Save/load tested
- [ ] Performance measured on target hardware
- [ ] Code signing certificate configured
- [ ] Store metadata, capsule art and screenshots
- [ ] Privacy/age/content declarations
- [ ] Crash log path tested

The packager is **unsigned** by design until a certificate exists. Do not claim a
production-signed build.
