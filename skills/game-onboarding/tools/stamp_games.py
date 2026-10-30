"""Write a baseline ship stamp (candidate) for every onboarded game. Idempotent.

A candidate records: the hash of the key files, the commit, and whether the local copy matched LIVE
at onboarding time. It is NOT an audit — pass a human name at ship time for that. Re-running with the
same files is a no-op.
"""
import hashlib
import json
import time
from pathlib import Path

PROJECTS = Path(r"<PROJECTS>")
FORGE_DATA = Path(r"<FORGE_DIR>\data")
GAMES = json.loads((FORGE_DATA / "games.json").read_text(encoding="utf-8"))["games"]
JUNK = {"vendor", "node_modules", "assets"}


def sha_lf(p: Path) -> str:
    return hashlib.sha256(p.read_bytes().replace(b"\r\n", b"\n")).hexdigest()


def key_files(site: Path) -> dict:
    out = {}
    idx = site / "index.html"
    if idx.is_file():
        out["index.html"] = sha_lf(idx)
    js = sorted((p for p in site.glob("*.js") if p.is_file()), key=lambda p: -p.stat().st_size)[:4]
    for p in js:
        out[p.name] = sha_lf(p)
    man = site / "assets" / "tiles" / "manifest.json"
    if man.is_file():
        out["assets/tiles/manifest.json"] = sha_lf(man)
    for p in sorted(site.glob("*.css"))[:2]:
        out[p.name] = sha_lf(p)
    return out


def main() -> int:
    rows = []
    for g in GAMES:
        slug = g["slug"]
        project = PROJECTS / slug
        site = project / "site"
        docs = project / "docs"
        vpath = docs / "VERSIONS.json"
        if not site.is_dir() or not vpath.exists():
            rows.append((slug, "skip", "no site/ or VERSIONS.json"))
            continue
        version = json.loads(vpath.read_text(encoding="utf-8"))
        files = key_files(site)
        if not files:
            rows.append((slug, "skip", "no key files"))
            continue
        bundle = hashlib.sha256()
        for rel in sorted(files):
            bundle.update(f"{rel}:{files[rel]}\n".encode())
        bundle.update(f"commit:{version.get('commit', '')}\n".encode())
        digest = bundle.hexdigest()
        stamp_path = docs / "SHIP-STAMPS.jsonl"
        existing = []
        if stamp_path.exists():
            for line in stamp_path.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if line:
                    try:
                        existing.append(json.loads(line))
                    except Exception:
                        pass
        if any(e.get("bundle_sha256") == digest for e in existing):
            rows.append((slug, "exists", digest[:16]))
            continue
        stamp = {
            "ts": time.strftime("%Y-%m-%dT%H:%M:%S"),
            "kind": "ship",
            "bundle_sha256": digest,
            "commit": version.get("commit", ""),
            "files": files,
            "live_match": version.get("live_match"),
            "signer": "delta",
            "human_signoff": "",
            "status": "candidate",
            "note": "onboarding baseline (not an audit)",
        }
        with stamp_path.open("a", encoding="utf-8") as fh:
            fh.write(json.dumps(stamp) + "\n")
        rows.append((slug, "stamped", digest[:16]))
    width = max(len(r[0]) for r in rows)
    for slug, state, detail in rows:
        print(f"  {slug:<{width}}  {state:<8} {detail}")
    print(f"\n{sum(1 for r in rows if r[1] == 'stamped')} stamped, "
          f"{sum(1 for r in rows if r[1] == 'exists')} already present, "
          f"{sum(1 for r in rows if r[1] == 'skip')} skipped")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
