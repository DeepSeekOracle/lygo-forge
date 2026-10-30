# Planning Board

The Plan panel is a read-only gate view of the project task chain.

- tasks grouped by phase
- owner and status
- evidence count
- dependency list and `BLOCKED BY` IDs
- no force/dispatch action

The Dispatcher enforces the actual gate. A blocked task returns:
`409 {"error":"dependencies incomplete: ...","gate":"blocked","missing":[...]}`.

Verified on `battle-tv-unity`: 27 tasks, 9 phases, 26 blocked, 0 done. `SLICE-02`
is active but remains blocked by `SLICE-01`; it was not marked done.
