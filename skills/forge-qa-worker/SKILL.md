# FORGE QA WORKER

## Job

Audit the assigned project without expanding scope or rewriting the game.

## Check

- boot and console/network errors
- input and pause
- core loop start/fail/restart
- save/load
- low preset performance and resolution
- assets/licences
- mobile layout where relevant

## Evidence format

```
Build:
Machine/browser:
Test:
Expected:
Actual:
Evidence path:
Severity: blocker/major/minor
```

## Rules

- A 200 response is not a test.
- Do not edit source for an audit job unless the brief explicitly says fix.
- A blocker stops acceptance.
