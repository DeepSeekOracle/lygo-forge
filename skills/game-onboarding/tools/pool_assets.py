"""Build the shared game-asset pool for the 18 Forge games. Idempotent, non-destructive.

Layout:
    <ASSETS>\\index.json            master index (per game: folders, counts, bytes, digest)
    <ASSETS>\\by-game\\<slug>        junction -> the project's site/ (browse one place, no copy)
    <ASSETS>\\shared\\              genuinely reusable packs (populated by hand, not here)

Why junctions: 18 games hold hundreds of MB of art. Copying it would duplicate everything and rot
the moment a game changes. A junction keeps one physical copy and one browsable tree.
"""
import hashlib
import json
import os
import subprocess
import sys
import time
from pathlib import Path

POOL = Path(r"<ASSETS>")
PROJECTS = Path(r"<PROJECTS>")
FORGE_DATA = Path(r"<FORGE_DIR>\data")
GAMES = json.loads((FORGE_DATA / "games.json").read_text(encoding="utf-8"))["games"]
ART = {".png": "image", ".jpg": "image", ".jpeg": "image", ".webp": "image", ".gif": "image",
       ".svg": "image", ".mp3": "audio", ".ogg": "audio", ".wav": "audio", ".m4a": "audio",
       ".glb": "model", ".gltf": "model", ".fbx": "model", ".ttf": "font", ".woff2": "font"}


def link(src: Path, dst: Path) -> str:
    if dst.exists():
        return "exists"
    try:
        r = subprocess.run(["cmd", "/c", "mklink", "/J", str(dst), str(src)],
                           capture_output=True, text=True, timeout=30)
        return "linked" if dst.exists() else f"failed({r.returncode})"
    except Exception as exc:
        return f"failed({exc})"


def scan(root: Path) -> dict:
    folders, kinds, total, files = {}, {}, 0, 0
    for dp, dirs, fs in os.walk(root):
        dirs[:] = [d for d in dirs if d not in (".git", "node_modules")]
        rel = str(Path(dp).relative_to(root)).replace("\\", "/") or "."
        for f in fs:
            kind = ART.get(Path(f).suffix.lower())
            if not kind:
                continue
            p = Path(dp) / f
            try:
                size = p.stat().st_size
            except OSError:
                continue
            files += 1
            total += size
            kinds[kind] = kinds.get(kind, 0) + 1
            e = folders.setdefault(rel, {"image": 0, "audio": 0, "model": 0, "font": 0})
            e[kind] = e.get(kind, 0) + 1
    return {"folders": folders, "kinds": kinds, "bytes": total, "files": files}


def main() -> int:
    (POOL / "by-game").mkdir(parents=True, exist_ok=True)
    (POOL / "shared").mkdir(parents=True, exist_ok=True)
    index = {"updated": time.strftime("%Y-%m-%dT%H:%M:%S"), "pool": str(POOL),
             "games": {}, "shared": [], "totals": {}}
    grand_files = grand_bytes = 0
    for g in GAMES:
        slug = g["slug"]
        site = PROJECTS / slug / "site"
        if not site.is_dir():
            index["games"][slug] = {"error": "no site/"}
            continue
        inv = scan(site)
        digest = hashlib.sha256()
        for folder in sorted(inv["folders"]):
            digest.update(f"{folder}:{json.dumps(inv['folders'][folder], sort_keys=True)}\n".encode())
        st = link(site, POOL / "by-game" / slug)
        index["games"][slug] = {
            "title": g["title"], "engine": g.get("engine"),
            "junction": st, "site": str(site),
            "files": inv["files"], "bytes": inv["bytes"], "kinds": inv["kinds"],
            "folders": inv["folders"],
            "digest": digest.hexdigest()[:32],
        }
        grand_files += inv["files"]
        grand_bytes += inv["bytes"]
        print(f"  {slug:22s} {inv['files']:>5} assets  {inv['bytes']/1e6:>8.1f} MB  {st}")
    index["totals"] = {"games": len(GAMES), "asset_files": grand_files,
                       "asset_mb": round(grand_bytes / 1e6, 1)}
    (POOL / "index.json").write_text(json.dumps(index, indent=1) + "\n", encoding="utf-8")
    print(f"\npool index: {POOL / 'index.json'}")
    print(f"totals: {grand_files} asset files, {round(grand_bytes / 1e6, 1)} MB across {len(GAMES)} games")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
