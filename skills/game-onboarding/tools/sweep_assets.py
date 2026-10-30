"""Full-drive game-asset sweep with attribution. Read-only.

Walks every fixed drive, finds folders that hold media (images/audio/3d/fonts), attributes each to
one of the 18 games by path/name evidence, and writes:

    <ASSETS>\\discovered.json   machine index (per folder: counts, bytes, game, confidence)
    <ASSETS>\\REPORT.md         human report (per drive, per game, biggest unattributed)

Nothing is moved or copied. Attribution is evidence-based and records WHY it matched.
"""
import json
import os
import string
import sys
import time
from collections import defaultdict

MEDIA = {".png": "image", ".jpg": "image", ".jpeg": "image", ".webp": "image", ".gif": "image",
         ".svg": "image", ".bmp": "image", ".tga": "image", ".psd": "image", ".aseprite": "image",
         ".ase": "image", ".tif": "image", ".tiff": "image", ".ico": "image",
         ".mp3": "audio", ".ogg": "audio", ".wav": "audio", ".m4a": "audio", ".flac": "audio",
         ".opus": "audio",
         ".glb": "model", ".gltf": "model", ".fbx": "model", ".obj": "model", ".blend": "model",
         ".ttf": "font", ".woff": "font", ".woff2": "font", ".otf": "font"}
PRUNE = {".git", "node_modules", ".venv", "venv", "__pycache__", ".cache", "appdata",
         "windows", "program files", "program files (x86)", "$recycle.bin", ".npm",
         "site-packages", ".next", "dist", ".gradle", ".nuget", "winsxs"}
POOL = r"<ASSETS>"
GAMES_JSON = r"<FORGE_DIR>\data\games.json"

games = json.load(open(GAMES_JSON, encoding="utf-8"))["games"]
# evidence tokens per game: slug, plus distinctive title words
TOKENS = {}
for g in games:
    toks = {g["slug"].replace("-", "")}
    for w in g["title"].lower().replace("-", " ").split():
        if len(w) >= 5 and w not in ("lattice", "games", "tower", "masters", "haven"):
            toks.add(w)
    TOKENS[g["slug"]] = toks


def drives():
    out = []
    for L in string.ascii_uppercase:
        root = f"{L}:\\"
        if os.path.isdir(root):
            try:
                if os.stat(root).st_dev:
                    out.append(root)
            except OSError:
                pass
    return out


def attribute(path: str, name: str):
    low = path.lower().replace("\\", "/")
    best, why = None, ""
    for slug in TOKENS:
        if f"/games/{slug}" in low or f"/{slug}/" in low or low.endswith("/" + slug):
            return slug, "path contains the slug"
    for slug, toks in TOKENS.items():
        for t in toks:
            if t in name:
                if best is None or len(t) > len(why):
                    best, why = slug, f"folder name contains '{t}'"
    return best, why


rows = []
per_drive = defaultdict(lambda: {"folders": 0, "files": 0, "bytes": 0})
MAXDEPTH = int(sys.argv[1]) if len(sys.argv) > 1 else 8
seen_dirs = 0
t0 = time.time()
for root in drives():
    base = root.rstrip("\\").count(os.sep)
    for dirpath, dirs, files in os.walk(root, onerror=lambda e: None):
        depth = dirpath.count(os.sep) - base
        if depth > MAXDEPTH:
            dirs[:] = []
            continue
        dirs[:] = [d for d in dirs if d.lower() not in PRUNE and not d.startswith("$")]
        seen_dirs += 1
        if seen_dirs % 20000 == 0:
            print(f"  … {seen_dirs} dirs, {len(rows)} asset folders, {round(time.time() - t0)}s", flush=True)
        counts = defaultdict(int)
        total = 0
        for f in files:
            kind = MEDIA.get(os.path.splitext(f)[1].lower())
            if not kind:
                continue
            counts[kind] += 1
            try:
                total += os.stat(os.path.join(dirpath, f)).st_size
            except OSError:
                pass
        n = sum(counts.values())
        if n < 3:
            continue
        name = os.path.basename(dirpath).lower()
        slug, why = attribute(dirpath, name)
        rec = {"path": dirpath, "files": n, "bytes": total,
               "kinds": dict(counts), "game": slug or "", "why": why,
               "pooled": dirpath.lower().startswith(POOL.lower())}
        rows.append(rec)
        d = per_drive[root]
        d["folders"] += 1
        d["files"] += n
        d["bytes"] += total

rows.sort(key=lambda r: -r["bytes"])
os.makedirs(POOL, exist_ok=True)
json.dump({"generated": time.strftime("%Y-%m-%dT%H:%M:%S"),
           "drives": sorted(per_drive), "folders": rows},
          open(os.path.join(POOL, "discovered.json"), "w", encoding="utf-8"), indent=1)

per_game = defaultdict(lambda: {"folders": 0, "files": 0, "bytes": 0})
for r in rows:
    key = r["game"] or "(unattributed)"
    per_game[key]["folders"] += 1
    per_game[key]["files"] += r["files"]
    per_game[key]["bytes"] += r["bytes"]

L = []
w = L.append
w("# Game asset sweep — every drive\n")
w(f"Generated {time.strftime('%Y-%m-%d %H:%M')} · walked {len(drives())} drives · "
  f"{len(rows)} asset folders · {sum(r['files'] for r in rows):,} media files · "
  f"{round(sum(r['bytes'] for r in rows) / 1e9, 2)} GB\n")
w("Nothing was moved. This is an index, and the attribution says *why* it matched.\n")
w("## By drive\n")
w("| Drive | Folders | Files | Size |")
w("|---|---|---|---|")
for d in sorted(per_drive, key=lambda x: -per_drive[x]["bytes"]):
    s = per_drive[d]
    w(f"| {d} | {s['folders']} | {s['files']:,} | {round(s['bytes'] / 1e9, 2)} GB |")
w("\n## By game\n")
w("| Game | Folders | Files | Size |")
w("|---|---|---|---|")
for g in sorted(per_game, key=lambda x: -per_game[x]["bytes"]):
    s = per_game[g]
    w(f"| {g} | {s['folders']} | {s['files']:,} | {round(s['bytes'] / 1e9, 2)} GB |")
w("\n## Biggest folders\n")
w("| Size | Files | Game | Path |")
w("|---|---|---|---|")
for r in rows[:25]:
    w(f"| {round(r['bytes'] / 1e6, 1)} MB | {r['files']:,} | {r['game'] or '—'} | `{r['path']}` |")
w("\n## Unattributed, over 50 MB (candidates to claim or bin)\n")
w("| Size | Files | Path |")
w("|---|---|---|")
for r in [x for x in rows if not x["game"] and x["bytes"] > 50e6][:30]:
    w(f"| {round(r['bytes'] / 1e6, 1)} MB | {r['files']:,} | `{r['path']}` |")
open(os.path.join(POOL, "REPORT.md"), "w", encoding="utf-8").write("\n".join(L) + "\n")

print(f"drives={len(drives())} folders={len(rows)} files={sum(r['files'] for r in rows):,} "
      f"gb={round(sum(r['bytes'] for r in rows) / 1e9, 2)} in {round(time.time() - t0, 1)}s")
print("wrote discovered.json + REPORT.md")
for g in sorted(per_game, key=lambda x: -per_game[x]["bytes"])[:8]:
    s = per_game[g]
    print(f"  {g:24s} {s['folders']:>5} folders  {round(s['bytes'] / 1e6):>7} MB")
