#!/usr/bin/env python3
r"""Content-addressed asset vault with import validation.

Usage:
  python asset_vault.py init --vault <PROJECTS>\_vault
  python asset_vault.py ingest --vault ... --project demo --file path.png --kind image --source generated
  python asset_vault.py verify --vault ...
  python asset_vault.py list --vault ... --project demo

The vault stores immutable files by SHA-256 and a JSON index with provenance.
It does not generate art and does not grant rights; it records what was used.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import struct
from datetime import datetime, timezone
from pathlib import Path

IMAGE_EXT = {".png", ".jpg", ".jpeg", ".webp", ".gif"}
MODEL_EXT = {".glb", ".gltf", ".obj", ".fbx"}
AUDIO_EXT = {".wav", ".mp3", ".ogg", ".flac"}
VIDEO_EXT = {".mp4", ".webm", ".mov"}


def digest(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def image_info(path: Path) -> dict:
    try:
        from PIL import Image
        with Image.open(path) as im:
            return {"width": im.width, "height": im.height, "mode": im.mode, "format": im.format}
    except Exception as exc:
        return {"error": f"{type(exc).__name__}: {exc}"}


def glb_info(path: Path) -> dict:
    """Minimal binary glTF header check, without a 3D dependency."""
    try:
        raw = path.read_bytes()[:20]
        if len(raw) < 20:
            return {"valid": False, "error": "short GLB"}
        magic, version, length = struct.unpack_from("<4sII", raw, 0)
        if magic != b"glTF":
            return {"valid": False, "error": "bad GLB magic"}
        return {"valid": True, "version": version, "declared_bytes": length, "actual_bytes": path.stat().st_size}
    except Exception as exc:
        return {"valid": False, "error": f"{type(exc).__name__}: {exc}"}


def validate(path: Path, kind: str) -> dict:
    info = {"kind": kind, "bytes": path.stat().st_size, "suffix": path.suffix.lower()}
    if kind == "image":
        info.update(image_info(path))
        info["valid"] = not info.get("error") and info.get("width", 0) > 0
    elif kind == "model":
        info.update(glb_info(path))
    elif kind in ("audio", "video"):
        info["valid"] = path.stat().st_size > 1024
    else:
        info["valid"] = path.stat().st_size > 0
    return info


def load_index(vault: Path) -> dict:
    p = vault / "index.json"
    if not p.exists():
        return {"version": 1, "created": datetime.now(timezone.utc).isoformat(), "assets": {}}
    return json.loads(p.read_text(encoding="utf-8"))


def save_index(vault: Path, index: dict) -> None:
    tmp = vault / "index.json.tmp"
    tmp.write_text(json.dumps(index, indent=2) + "\n", encoding="utf-8")
    tmp.replace(vault / "index.json")


def init(vault: Path) -> dict:
    vault.mkdir(parents=True, exist_ok=True)
    (vault / "objects").mkdir(exist_ok=True)
    index = load_index(vault)
    save_index(vault, index)
    return {"ok": True, "vault": str(vault), "assets": len(index["assets"])}


def ingest(vault: Path, file: Path, project: str, kind: str, source: str, license_note: str) -> dict:
    if not file.is_file():
        return {"ok": False, "error": "file_missing", "file": str(file)}
    sha = digest(file)
    ext = file.suffix.lower()
    obj = vault / "objects" / sha[:2] / (sha + ext)
    obj.parent.mkdir(parents=True, exist_ok=True)
    if not obj.exists():
        shutil.copy2(file, obj)
    index = load_index(vault)
    rec = index["assets"].get(sha)
    info = validate(obj, kind)
    if rec is None:
        rec = {
            "sha256": sha,
            "path": str(obj),
            "file": file.name,
            "project": project,
            "kind": kind,
            "source": source,
            "license_note": license_note,
            "bytes": obj.stat().st_size,
            "first_seen": datetime.now(timezone.utc).isoformat(),
            "validation": info,
            "refs": [],
        }
        index["assets"][sha] = rec
    ref = {"project": project, "file": str(file), "at": datetime.now(timezone.utc).isoformat()}
    if ref not in rec["refs"]:
        rec["refs"].append(ref)
    save_index(vault, index)
    return {"ok": bool(info.get("valid", True)), "sha256": sha, "object": str(obj), "duplicate": len(rec["refs"]) > 1, "validation": info}


def verify(vault: Path) -> dict:
    index = load_index(vault)
    bad = []
    for sha, rec in index["assets"].items():
        p = Path(rec["path"])
        if not p.exists():
            bad.append({"sha256": sha, "error": "missing"})
            continue
        got = digest(p)
        if got != sha:
            bad.append({"sha256": sha, "error": "hash_mismatch", "actual": got})
    return {"ok": not bad, "assets": len(index["assets"]), "bad": bad}


def list_assets(vault: Path, project: str | None) -> dict:
    index = load_index(vault)
    items = []
    for sha, rec in index["assets"].items():
        if project and rec.get("project") != project and not any(r.get("project") == project for r in rec.get("refs", [])):
            continue
        items.append({k: rec.get(k) for k in ("sha256", "file", "project", "kind", "source", "license_note", "bytes", "validation")})
    return {"ok": True, "count": len(items), "assets": items}


def main() -> int:
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    p_init = sub.add_parser("init"); p_init.add_argument("--vault", required=True)
    p_in = sub.add_parser("ingest"); p_in.add_argument("--vault", required=True); p_in.add_argument("--file", required=True); p_in.add_argument("--project", default="untitled"); p_in.add_argument("--kind", choices=["image", "model", "audio", "video", "other"], default="other"); p_in.add_argument("--source", default="unknown"); p_in.add_argument("--license", default="unreviewed")
    p_v = sub.add_parser("verify"); p_v.add_argument("--vault", required=True)
    p_l = sub.add_parser("list"); p_l.add_argument("--vault", required=True); p_l.add_argument("--project")
    args = ap.parse_args()
    if args.cmd == "init": out = init(Path(args.vault))
    elif args.cmd == "ingest": out = ingest(Path(args.vault), Path(args.file), args.project, args.kind, args.source, args.license)
    elif args.cmd == "verify": out = verify(Path(args.vault))
    else: out = list_assets(Path(args.vault), args.project)
    print(json.dumps(out, indent=2))
    return 0 if out.get("ok") else 1


if __name__ == "__main__":
    raise SystemExit(main())
