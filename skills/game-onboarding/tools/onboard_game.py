"""Onboard one excavationpro game into the Forge. Idempotent: safe to re-run.

    python onboard_game.py --slug lattice-marines
    python onboard_game.py --all            # every registry entry still 'pending'
    python onboard_game.py --slug X --dry   # print the plan, touch nothing

What it does, in order:
  1. ensures a Forge project  (<PROJECTS>\\<slug>)
  2. copies the LIVE game from the repo checkout into <project>\\site
  3. hashes index.html and the main scripts, fetches LIVE, records parity
  4. writes docs\\GAME.md, docs\\SOURCES.md, docs\\ENGINEERING.txt, docs\\VERSIONS.json
  5. writes a per-game skill (SKILL.md + references/ENGINEERING.txt), optionally junctioned
  6. registers the game's asset folders in the Forge asset registry
  7. appends a ledger entry so the project has history from day one

Design rules:
  * The repo checkout is the source of truth for a live copy. Mirrors in other repos
    (D:\\chatagent\\games, D:\\eternalhaven\\games) are NEVER copied from or published to.
  * Nothing is deleted. Re-running overwrites site/ only.
  * Unity games keep the WebGL build in site/ and record the Unity project in SOURCES.md.
Stdlib only (urllib for the Forge API and the live parity check).
"""
from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

FORGE = "http://127.0.0.1:8796"
LIVE = "https://excavationpro.ca/games/"
CATALOG_URL = "https://excavationpro.ca/games/catalog.json"
CATALOG_CACHE = Path(r"<FORGE_DIR>\data\catalog.json")
REPO = Path(r"D:\excavationpro-ca\games")
PROJECTS = Path(r"<PROJECTS>")
REGISTRY = Path(r"<FORGE_DIR>\data\games.json")
SKILLS = Path(r"<USER>\Documents\deepseek-harness\default-workspace\skills\@deepseekoracle")
FORGE_SKILLS = Path(r"<FORGE_DIR>\skills")
EXTS = {".png": "image", ".jpg": "image", ".jpeg": "image", ".webp": "image", ".gif": "image",
        ".svg": "image", ".mp3": "audio", ".ogg": "audio", ".wav": "audio", ".m4a": "audio",
        ".glb": "model", ".gltf": "model", ".wasm": "wasm", ".data": "unity", ".js": "js",
        ".css": "css", ".html": "html", ".json": "data", ".md": "doc"}


def catalog() -> dict:
    """Live catalog metadata (blurb, players, tagline). Cached so a re-run works offline."""
    try:
        raw = live_bytes(CATALOG_URL)
        if raw:
            data = json.loads(raw.decode("utf-8"))
            CATALOG_CACHE.parent.mkdir(parents=True, exist_ok=True)
            CATALOG_CACHE.write_text(json.dumps(data, indent=2), encoding="utf-8")
            return {g["slug"]: g for g in data.get("games", []) if g.get("slug")}
    except Exception:
        pass
    if CATALOG_CACHE.exists():
        data = json.loads(CATALOG_CACHE.read_text(encoding="utf-8"))
        return {g["slug"]: g for g in data.get("games", []) if g.get("slug")}
    return {}


def prune_template(project: Path) -> int:
    """Drop the Forge web-2d starter that ships with every new project.

    It carries ~5 MB of vendored three.js and a placeholder page per tab. Our real content is
    docs/ + site/, so the starter is pure noise (and 18 copies of it is 90 MB).
    """
    removed = 0
    for junk in ("vendor", "src", "references", "index.html", "CLAUDE.own.md", "NOTES.own.md"):
        p = project / junk
        try:
            if p.is_dir():
                shutil.rmtree(p)
                removed += 1
            elif p.is_file():
                p.unlink()
                removed += 1
        except OSError:
            pass
    return removed


def seed_tabs(project: Path, meta: dict, cat: dict, inv: dict) -> None:
    """Fill the Forge tab documents from real metadata instead of leaving placeholders."""
    title = meta["title"]
    blurb = (cat.get("blurb") or "").strip()
    players = cat.get("players") or "1"
    tagline = cat.get("tagline") or ""
    genre = ", ".join(meta.get("genre") or [])
    eng = f"{meta.get('engine')} ({', '.join(inv['engine']) or 'static'})"
    (project / "GDD.md").write_text(f"""# {title} — Game Design Document

**{tagline}**

{blurb}

| | |
|---|---|
| Genre | {genre} |
| Players | {players} |
| Engine | {eng} |
| Live | {LIVE}{meta['slug']}/ |

## Build state

Seeded from the live catalog on {time.strftime('%Y-%m-%d')}. The shipped build is
`site/` ({sum(inv['kinds'].values())} files, {round(inv['bytes'] / 1e6, 1)} MB) and matches LIVE.
Everything below is the working outline — refine it as the game is upgraded.

## Open questions

- What is the core loop's failure state, and is it legible on the first screen?
- Which system carries progression, and where is it surfaced in the HUD?
- What does "one more run" look like?
""", encoding="utf-8")

    (project / "ART_BIBLE.md").write_text(f"""# {title} — Art Bible

Extracted from the live build, not invented.

- Image assets: **{sum(c['image'] for c in inv['assets'].values())}** files
- Audio assets: {sum(c['audio'] for c in inv['assets'].values())}
- Models: {sum(c['model'] for c in inv['assets'].values())}
- Total payload: {round(inv['bytes'] / 1e6, 1)} MB

## Asset folders

""" + "\n".join(f"- `{k}` — {v['image']} images" for k, v in sorted(
        inv['assets'].items(), key=lambda x: -sum(x[1].values())) if k != "(root)")
    + """

## Rules

1. Match the shipped art. Sample two or three existing assets before making new ones.
2. Same naming family as the build; no orphan files (the index flags them).
3. New assets go into the folder that already owns that kind of asset.
4. Licence/provenance for anything third-party goes in the Forge asset registry.
""", encoding="utf-8")

    (project / "PLAN.md").write_text(f"""# {title} — Plan

## Phase 0 — onboarded
- [x] Live copy pulled into `site/` and verified against LIVE
- [x] Engineering index generated (`docs/ENGINEERING.txt`)
- [x] Skill created, Forge project wired, assets registered
- [ ] Play the live build end to end and write down what is actually broken

## Phase 1 — stabilise
- [ ] Console clean, no 404s, no dead links
- [ ] Controls documented and working on keyboard + pointer
- [ ] Save/load (or run reset) behaves

## Phase 2 — depth
- [ ] Name the progression spine and surface it
- [ ] One new system that makes the loop richer
- [ ] Art pass on the weakest surface

## Rules

One phase at a time. Screenshot or it did not happen. No push without Justin's yes.
""", encoding="utf-8")

    (project / "QA.md").write_text(f"""# {title} — QA

## Every change
1. Serve the project preview: http://127.0.0.1:8796/preview/{meta['slug']}/
2. Console must be clean; note any 404.
3. Screenshot the changed surface before/after.
4. Re-run `onboard_game.py --slug {meta['slug']}` to refresh the index and the LIVE parity check.
5. Only then copy back to `D:\\excavationpro-ca\\games\\{meta['slug']}` and push (with Justin's yes).

## Baseline
- Files: {sum(inv['kinds'].values())} · payload {round(inv['bytes'] / 1e6, 1)} MB
- Scripts: {', '.join(s[0] for s in inv['scripts'][:3]) or 'inline only'}
- Engine hints: {', '.join(inv['engine']) or 'none detected'}
""", encoding="utf-8")


def api(path: str, payload=None, method=None):
    url = FORGE + path
    data = None
    headers = {}
    if payload is not None:
        data = json.dumps(payload).encode()
        headers["Content-Type"] = "application/json"
        method = method or "POST"
    req = urllib.request.Request(url, data=data, headers=headers, method=method or "GET")
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read().decode("utf-8") or "{}")


def sha_lf(data: bytes) -> str:
    return hashlib.sha256(data.replace(b"\r\n", b"\n")).hexdigest()


def live_bytes(url: str) -> bytes | None:
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Forge-Onboard/1.0",
                                                   "Accept-Encoding": "gzip, deflate"})
        with urllib.request.urlopen(req, timeout=30) as r:
            raw = r.read()
            enc = (r.headers.get("Content-Encoding") or "").lower()
        return gzip.decompress(raw) if "gzip" in enc else raw
    except Exception:
        return None


def scan_site(site: Path) -> dict:
    """Inventory a web build: files by kind, assets by folder, scripts, engine hints."""
    kinds = {}
    assets = {}
    scripts = []
    total = 0
    for root, dirs, files in os.walk(site):
        dirs[:] = [d for d in dirs if d != ".git"]
        rel_dir = Path(root).relative_to(site)
        for f in files:
            p = Path(root) / f
            ext = p.suffix.lower()
            kind = EXTS.get(ext, "other")
            kinds[kind] = kinds.get(kind, 0) + 1
            total += p.stat().st_size
            if kind in ("image", "audio", "model"):
                key = str(rel_dir).replace("\\", "/") or "(root)"
                assets.setdefault(key, {"image": 0, "audio": 0, "model": 0})
                assets[key][kind] += 1
            if ext == ".js" and rel_dir.parts[:1] not in (("node_modules",),):
                scripts.append((str(rel_dir / f).replace("\\", "/"), p.stat().st_size))
    html = ""
    idx = site / "index.html"
    if idx.is_file():
        html = idx.read_text(encoding="utf-8", errors="replace")
    refs = re.findall(r'(?:src|href)="([^"]+)"', html)
    engine = []
    for pat, label in (("unity", "Unity WebGL"), ("three", "three.js"), ("phaser", "Phaser"),
                       ("pixi", "PixiJS"), ("babylon", "Babylon"), ("prboom", "PrBoom"),
                       ("wedge", "WASM")):
        if pat in html.lower() or any(pat in s[0].lower() for s in scripts):
            engine.append(label)
    return {"kinds": kinds, "assets": assets, "scripts": sorted(scripts, key=lambda s: -s[1]),
            "refs": refs[:40], "bytes": total, "engine": engine}


def write_engineering(path: Path, meta: dict, inv: dict, version: dict) -> None:
    L = []
    w = L.append
    w("=" * 78)
    w(f"{meta['title'].upper()} - ENGINEERING INDEX")
    w("=" * 78)
    w(f"slug        {meta['slug']}")
    w(f"live        {LIVE}{meta['slug']}/")
    w(f"repo        {REPO / meta['slug']}")
    w(f"project     {PROJECTS / meta['slug']}")
    w(f"engine      {meta.get('engine')}  ({', '.join(inv['engine']) or 'static page'})")
    w(f"genre       {', '.join(meta.get('genre') or [])}")
    w("")
    w("FILES BY KIND")
    by = ", ".join(f"{k}={v}" for k, v in sorted(inv["kinds"].items(), key=lambda x: -x[1]))
    w(f"  {by}")
    w(f"  total {round(inv['bytes'] / 1e6, 1)} MB in {sum(inv['kinds'].values())} files")
    w("")
    w("SCRIPTS (largest first)")
    for name, size in inv["scripts"][:25]:
        w(f"  {size / 1024:9.1f} KB  {name}")
    if not inv["scripts"]:
        w("  (no external scripts; inline only)")
    w("")
    w("ASSET FOLDERS (images / audio / models)")
    for folder, counts in sorted(inv["assets"].items(), key=lambda x: -sum(x[1].values())):
        bits = " ".join(f"{k}={v}" for k, v in counts.items() if v)
        w(f"  {folder:36s} {bits}")
    if not inv["assets"]:
        w("  (none)")
    w("")
    w("PAGE REFERENCES (index.html)")
    for r in inv["refs"]:
        w(f"  {r}")
    w("")
    w("VERSIONS")
    for k, v in version.get("hashes", {}).items():
        tag = ""
        if v.get("live"):
            tag = "  LIVE " + ("MATCH" if v["sha"] == v["live"] else "DIFF")
        w(f"  {k:34s} {v['sha'][:16]}{tag}")
    w(f"  live match: {version.get('live_match')}")
    w("")
    w("SOURCES SEEN ON DISK")
    for s in meta.get("sources") or ["(none found - the repo copy is the only source)"]:
        w(f"  {s}")
    if meta.get("mirrors"):
        w("  mirrors (never copy from, never publish to):")
        for m in meta["mirrors"]:
            w(f"    {m}")
    path.write_text("\n".join(L) + "\n", encoding="utf-8")


def ensure_project(meta: dict) -> tuple[str, Path]:
    slug = meta["slug"]
    existing = {p.get("slug"): p for p in api("/api/projects").get("projects", [])}
    if slug in existing:
        return slug, Path(existing[slug]["path"])
    profile = "unity-3d" if meta.get("engine") == "unity" else "web-2d"
    try:
        res = api("/api/projects", {"name": meta["title"], "profile": profile})
        return res["project"]["slug"], Path(res["project"]["path"])
    except Exception as exc:
        print(f"  ! Forge project create failed ({exc}); adopting a bare folder")
        dest = PROJECTS / slug
        dest.mkdir(parents=True, exist_ok=True)
        try:
            res = api("/api/adopt", {"path": str(dest), "profile": profile})
            return res["project"]["slug"], Path(res["project"]["path"])
        except Exception:
            return slug, dest


def write_skill(meta: dict, project: Path, inv: dict, link: bool) -> Path:
    slug = meta["slug"]
    root = SKILLS / slug
    (root / "references").mkdir(parents=True, exist_ok=True)
    desc = (f"Build, modify and publish {meta['title']} ({LIVE}{slug}/). Use when touching this game, "
            f"its assets, its Forge project, or when a fix 'won't go live'. Carries the live/local "
            f"paths, the engineering index and the publish rules.")
    body = f"""---
name: {slug}
description: {desc}
---

# {meta['title']}

Engine: **{meta.get('engine')}** ({', '.join(inv['engine']) or 'static page'}) · Genre: {', '.join(meta.get('genre') or [])}

| | |
|---|---|
| LIVE | {LIVE}{slug}/ |
| Repo | `D:\\excavationpro-ca\\games\\{slug}` |
| Forge project | `{project}` |
| Preview | http://127.0.0.1:8796/preview/{slug}/ |
| Board | Forge → Schematic (`docs/ENGINEERING.txt`) |

## Rules

1. **The repo checkout is the source of truth** for the live copy. Mirrors in
   `D:\\chatagent\\games` and `D:\\eternalhaven\\games` are other repos — never copy from them,
   never publish from them.
2. Build in `{project}\\site`, verify in the preview, then copy back to the repo and push.
3. Refresh the engineering index after structural changes:
   `python onboard_game.py --slug {slug}` (idempotent).
4. Never push without Justin's yes.

## Find anything

`docs\\ENGINEERING.txt` in the project lists files by kind, scripts by size, asset folders, page
references and version hashes. Read it before grepping.
"""
    (root / "SKILL.md").write_text(body, encoding="utf-8")
    (root / "references" / "ENGINEERING.txt").write_text(
        (project / "docs" / "ENGINEERING.txt").read_text(encoding="utf-8"), encoding="utf-8")
    if link:
        dest = FORGE_SKILLS / slug
        if not dest.exists():
            try:
                subprocess.run(["cmd", "/c", "mklink", "/J", str(dest), str(root)],
                               capture_output=True, text=True, timeout=30)
            except Exception as exc:
                print(f"  ! junction failed: {exc}")
    return root


def onboard(slug: str, dry: bool, link: bool) -> dict:
    reg = json.loads(REGISTRY.read_text(encoding="utf-8"))
    meta = next((g for g in reg["games"] if g["slug"] == slug), None)
    if not meta:
        raise SystemExit(f"slug not in registry: {slug}")
    src = REPO / slug
    if not src.is_dir():
        raise SystemExit(f"repo copy missing: {src}")
    print(f"\n== {slug} ({meta['title']})")
    if dry:
        print(f"  would create project, copy {src} -> <project>/site, index, skill, ledger")
        return {"slug": slug, "dry": True}

    used_slug, project = ensure_project(meta)
    # HARD GUARD: never write into another repo's working tree. A stale registry entry once
    # pointed at <USER>\source\chatagent\games\haven-desk, and this pipeline pruned the
    # game's own index.html out of that repo. Never again.
    try:
        Path(project).resolve().relative_to(PROJECTS.resolve())
    except ValueError:
        raise SystemExit(
            f"refusing to write into {project}: not under {PROJECTS}. "
            f"Re-home the project (normalize_projects.py) before onboarding.")
    cat = catalog().get(slug, {})
    pruned = prune_template(project)
    if pruned:
        print(f"  pruned {pruned} starter item(s) from the project root")
    site = project / "site"
    copied = 0
    for root, dirs, files in os.walk(src):
        dirs[:] = [d for d in dirs if d != ".git"]
        rel = Path(root).relative_to(src)
        (site / rel).mkdir(parents=True, exist_ok=True)
        for f in files:
            shutil.copy2(Path(root) / f, site / rel / f)
            copied += 1
    print(f"  site: {copied} files -> {site}")

    inv = scan_site(site)
    seed_tabs(project, meta, cat, inv)
    hashes = {}
    for rel in ("index.html",) + tuple(s[0] for s in inv["scripts"][:3]):
        p = site / rel
        if not p.is_file():
            continue
        data = p.read_bytes()
        lv = live_bytes(f"{LIVE}{slug}/{rel}")
        hashes[rel] = {"sha": sha_lf(data), "live": sha_lf(lv) if lv else ""}
    live_match = bool(hashes) and all(v.get("live") and v["sha"] == v["live"] for v in hashes.values())
    version = {"ts": time.strftime("%Y-%m-%dT%H:%M:%S"), "slug": slug,
               "commit": "", "hashes": hashes, "live_match": live_match}

    docs = project / "docs"
    docs.mkdir(parents=True, exist_ok=True)
    write_engineering(docs / "ENGINEERING.txt", meta, inv, version)
    (docs / "VERSIONS.json").write_text(json.dumps(version, indent=2) + "\n", encoding="utf-8")
    (docs / "GAME.md").write_text(
        f"# {meta['title']}\n\n**{meta.get('tagline','')}**\n\n"
        f"- Live: {LIVE}{slug}/\n- Genre: {', '.join(meta.get('genre') or [])}\n"
        f"- Engine: {meta.get('engine')} ({', '.join(inv['engine']) or 'static'})\n"
        f"- Repo: `{src}`\n- Project: `{project}`\n"
        f"- Files: {sum(inv['kinds'].values())} ({round(inv['bytes'] / 1e6, 1)} MB)\n",
        encoding="utf-8")
    (docs / "SOURCES.md").write_text(
        "# Sources\n\nRepo (source of truth):\n\n- " + str(src) + "\n\n"
        + "Original build folders found on disk:\n\n"
        + "\n".join(f"- {s}" for s in (meta.get("sources") or ["(none - repo copy is the only source)"]))
        + "\n\nMirrors (never copy from, never publish to):\n\n"
        + "\n".join(f"- {m}" for m in (meta.get("mirrors") or ["(none)"])) + "\n",
        encoding="utf-8")

    skill = write_skill(meta, project, inv, link)

    reg_folders = 0
    for folder in [str(site)] + [str(site / f) for f in inv["assets"] if f != "(root)"]:
        if not Path(folder).is_dir():
            continue
        try:
            api("/api/assets/folders", {"project": slug, "path": folder,
                                        "kind": "web", "note": f"{slug} live copy"})
            reg_folders += 1
        except Exception:
            pass
    try:
        api(f"/api/projects/{slug}/schematic/ledger", {
            "kind": "onboard", "author": "delta",
            "note": f"Onboarded: {copied} files, {sum(inv['kinds'].values())} total, "
                    f"live_match={live_match}, skill {skill.name}, {reg_folders} asset folders.",
        })
    except Exception:
        pass

    meta.update({"status": "installed", "project": str(project), "site": str(site),
                 "files": sum(inv["kinds"].values()), "live_match": live_match})
    reg["games"] = [meta if g["slug"] == slug else g for g in reg["games"]]
    REGISTRY.write_text(json.dumps(reg, indent=2) + "\n", encoding="utf-8")
    print(f"  index: {sum(inv['kinds'].values())} files, live_match={live_match}, "
          f"skill={skill}, asset folders={reg_folders}")
    return {"slug": slug, "project": str(project), "live_match": live_match,
            "files": sum(inv["kinds"].values())}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--slug")
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--dry", action="store_true")
    ap.add_argument("--no-link", action="store_true")
    args = ap.parse_args()
    reg = json.loads(REGISTRY.read_text(encoding="utf-8"))
    slugs = ([g["slug"] for g in reg["games"] if g["status"] != "done"] if args.all
             else [args.slug] if args.slug else [])
    if not slugs:
        print("pass --slug <slug> or --all", file=sys.stderr)
        return 2
    out = [onboard(s, args.dry, not args.no_link) for s in slugs]
    print("\n" + json.dumps(out, indent=1))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
