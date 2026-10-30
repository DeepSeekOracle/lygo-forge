# Memvid — portable agent memory (`.mv2`)

**Source:** https://x.com/oliviscusAI/status/2114867142286078359 (2026-10-27)
**Repo:** https://github.com/memvid/memvid · **Docs:** https://docs.memvid.com
**Licence:** Apache-2.0
**What it is:** one file holds content, embeddings, full-text index and metadata. Append-only "Smart
Frames", timeline/rewind, no database, no server, works offline.

## Verdict: worth adopting — the pieces that matter work

Local test, 2026-10-28 on this machine:

| Check | Result |
|---|---|
| `pip install memvid-sdk` | **installed** (exit 0) |
| `memvid_sdk.create(path, kind="basic", enable_lex=True)` | **works** — created a 69,977-byte `.mv2` |
| `mem.put(text=...)` + `commit()` in a fresh TEMP dir | **works** — 82,249 bytes written |
| Searching a real project's docs (thousands of cards) | **fails** — `MV999: Tantivy error: An IO error occurred: 'Access is denied. (os error 5)'` |

So: the format, the SDK and single-card writes are real; bulk indexing of a project is **not yet
proven** and currently errors. Treat it as *installed and partially verified*, not as working
infrastructure.

## Important: package names are a trap

| Package | Reality |
|---|---|
| `pypi/memvid` 0.1.3 | the **old** video/MP4-based version — do not install |
| **`pypi/memvid-sdk`** | current Python SDK (installed) |
| `npm @memvid/sdk`, `memvid-cli` | Node SDK and CLI |
| `crates.io memvid-core` 2.0 | Rust core (`lex`, `vec`, `clip`, `whisper`, `api_embed`, `encryption`) |

The X post's `.mv2` claim matches `memvid-sdk`, not the `memvid` package.

## Where it belongs in LYGO

1. **Per-project memory capsule** — `.lygo-memory/<project>.mv2` inside each project, built from
   `GDD.md`, `BUILD.md`, `DECISIONS.md`, `TASKS.json`, `QA.md`. An agent dispatched to a task searches
   the capsule instead of re-reading 243 KB of `city.js`.
2. **Cold reviewer context** (`docs/SPEC-REVIEW.md`) — the Goldfish pass gets the capsule, not the chat.
3. **Hand-off between agents** — one file, copyable, no shared database, matches the "no server" rule.

## Tool

`<LYGO_DIR>\tools\lygo_memory.py`

```
lygo_memory.py build <project> [--name x]     # index docs -> .lygo-memory/x.mv2  (build in TEMP, then move)
lygo_memory.py find  <project> "query"        # search
lygo_memory.py stats <project>                # size
```

Known issues, measured:
- bulk build currently hits the Tantivy `Access is denied` error above; single-card writes are fine,
  so the failure is in the index write path, not the capsule.
- Tantivy also cannot create its index directly inside `<PROJECTS>\...` (os error 5), which is
  why `build` writes in TEMP and moves the finished file.
- `put()` takes `text=` as a keyword; a positional payload raises
  `ValueError: put requires either 'text' or 'file' payload`.

## Next step, when it is picked up

Run `build` against one small project with `enable_lex=False` to confirm the capsule works without the
index, then isolate the Tantivy permission failure (temp dir permissions vs. the Rust crate's mmap).
Do not wire it into the dispatcher until a `find` returns real hits on a real project.
