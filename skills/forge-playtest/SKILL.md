# Forge Playtest Worker

Prove a build loads, renders, responds to scripted input and stays free of console/page errors.

## Web

```powershell
node <FORGE_DIR>\pipeline\playtest_web.mjs `
  --url http://127.0.0.1:8796/ `
  --out <USER>\Documents\deepseek-harness\default-workspace\outbox\playtest `
  --wait 2500
```

Optional actions:

```json
[
  {"type": "click", "selector": "#play"},
  {"type": "key", "key": "ArrowRight"},
  {"type": "wait", "ms": 1500}
]
```

Reports `screen.png` and `playtest-report.json` with `fps`, `status`, console errors,
page errors and failed requests.

Forge dispatcher brief:

```json
{
  "url": "http://127.0.0.1:8796/",
  "out": "<PROJECTS>/demo/qa/playtest",
  "wait": 2500,
  "actions": [{"type": "click", "selector": "#play"}]
}
```

Skill: `forge-playtest`, agent: `playtest-web`.

## Unity

```powershell
powershell -File <FORGE_DIR>\pipeline\playtest_unity.ps1 `
  -ProjectPath <PROJECTS>\demo `
  -TestPlatform PlayMode
```

This runs Unity Test Framework in batch mode and records pass/fail. Add Unity Recorder
captures for visual proof; a green test is not a visual check.

## Acceptance rules

- Web: status < 400, no page errors, no console errors, 60 s or less to a screenshot.
- Unity: all PlayMode tests pass and at least one scene loads.
- Record a short manual playtest with a human; automated probes cannot judge fun.
- Do not call a blank page or a single screenshot “playable”.
