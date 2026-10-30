# QA and Evidence

## What counts as evidence

- A command and its output.
- A screenshot or recording at a named resolution.
- A test result file.
- A measured number with machine/browser/build.

A 200 response, a title, or "looks good" is not evidence.

## Test matrix

| Area | Minimum |
|---|---|
| Boot | cold load, no console errors, no 404 |
| Input | keyboard, pointer/touch, pause, remap |
| Core loop | start → challenge → fail/win → restart |
| Save | write, reload, corrupt/clear |
| Performance | low preset, 60 s, frame time |
| Audio | gesture start, mute, loop |
| Accessibility | contrast, scale, reduced motion |
| Build | reproducible, version/hash, credits |

## Bug report

```
ID:
Build:
Machine/browser:
Steps:
Expected:
Actual:
Evidence:
Severity: blocker / major / minor
```

## Release verdict

- **Pass** — no blockers, budgets met, credits complete.
- **Conditional** — known issues listed with owner/date.
- **Fail** — any blocker or missing licence.

## Drift audit

At every gate, compare the build to `GAME.md` pillars and non-goals. If the build no longer matches, update the decision record or cut the feature — do not silently expand.
