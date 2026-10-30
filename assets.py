"""Asset pointer registry and project asset layout."""
from __future__ import annotations

import hashlib
import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DATA = Path(os.environ.get("LYGO_FORGE_DATA", r"<FORGE_DIR>\data"))
SKILLS_DIR = Path(os.environ.get("LYGO_FORGE_SKILLS", r"<FORGE_DIR>\skills"))
SOURCES_FILE = SKILLS_DIR / "forge-asset-pointer" / "sources.json"
CENTRAL = DATA / "assets.json"

KINDS = {"2d", "3d", "texture", "animation", "audio", "ui", "font", "reference", "data", "other"}
STATUSES = {"candidate", "approved", "integrated", "rejected"}


def sources() -> dict:
    return json.loads(SOURCES_FILE.read_text(encoding="utf-8"))


def _load() -> dict:
    if not CENTRAL.exists():
        return {"assets": []}
    try:
        return json.loads(CENTRAL.read_text(encoding="utf-8"))
    except Exception:
        return {"assets": []}


def _save(data: dict) -> None:
    CENTRAL.parent.mkdir(parents=True, exist_ok=True)
    CENTRAL.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def ensure_layout(project_path: str | Path) -> Path:
    root = Path(project_path)
    for name in ("_inbox", "references", "source", "working", "engine", "licenses", "manifests"):
        (root / "assets" / name).mkdir(parents=True, exist_ok=True)
    return root / "assets"


def _hash(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return "sha256:" + h.hexdigest()


def pointers(project: str) -> list[dict]:
    return [a for a in _load().get("assets", []) if a.get("project") == project]


def add_pointer(project: str, project_path: str, payload: dict) -> dict:
    root = Path(project_path).resolve()
    ensure_layout(root)
    path_raw = str(payload.get("path") or "").strip()
    if not path_raw:
        raise ValueError("path required")
    path = Path(path_raw)
    if not path.is_absolute():
        path = root / path
    path = path.resolve()
    try:
        path.relative_to(root)
    except ValueError:
        raise ValueError("asset path must stay inside the project")
    source_url = str(payload.get("source_url") or "").strip()
    license_name = str(payload.get("license") or "").strip()
    if not source_url or not license_name:
        raise ValueError("source_url and license are required")
    kind = str(payload.get("kind") or "other").lower()
    if kind not in KINDS:
        raise ValueError("unsupported asset kind")
    status = str(payload.get("status") or "candidate").lower()
    if status not in STATUSES:
        raise ValueError("unsupported status")
    digest = payload.get("hash") or (_hash(path) if path.is_file() else "")
    record = {
        "id": "AST-" + time.strftime("%Y%m%d") + "-" + uuid.uuid4().hex[:8],
        "project": project,
        "kind": kind,
        "path": str(path),
        "source_url": source_url,
        "source_id": str(payload.get("source_id") or ""),
        "license": license_name,
        "attribution": str(payload.get("attribution") or ""),
        "hash": digest,
        "owner": str(payload.get("owner") or ""),
        "task": str(payload.get("task") or ""),
        "status": status,
        "notes": str(payload.get("notes") or ""),
        "created": time.time(),
    }
    data = _load()
    data.setdefault("assets", []).append(record)
    _save(data)
    mirror = root / "assets" / "manifests" / "assets.json"
    mirror.write_text(json.dumps({"project": project, "assets": pointers(project)}, indent=2) + "\n",
                      encoding="utf-8")
    return record


def summary(project: str | None = None) -> dict:
    src = sources()
    out = {
        "sources": src.get("sources", []),
        "policy": src.get("policy", {}),
        "pointer_count": len(_load().get("assets", [])),
    }
    if project:
        out["pointers"] = pointers(project)
    return out


MAX_FETCH_BYTES = 20 * 1024 * 1024
ALLOWED_SUFFIXES = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".wav", ".ogg", ".mp3",
                    ".glb", ".gltf", ".fbx", ".blend", ".txt", ".md", ".json"}


def fetch(project: str, project_path: str, payload: dict) -> dict:
    """Download an explicitly approved asset into _inbox and register a pointer.

    The source host must be on the catalogue allowlist. CC0 is automatic;
    anything else requires approve_restricted=true.
    """
    source_id = str(payload.get("source_id") or "").strip()
    source_list = sources().get("sources", [])
    source = next((s for s in source_list if s.get("id") == source_id), None)
    if not source:
        raise ValueError("unknown source_id")
    url = str(payload.get("url") or "").strip()
    parsed = urllib.parse.urlparse(url)
    if parsed.scheme != "https" or parsed.hostname not in source.get("download_hosts", []):
        raise ValueError("URL host is not allowlisted for this source")
    declared = str(payload.get("license") or "").strip()
    if source.get("license") == "CC0":
        license_name = "CC0"
    else:
        license_name = declared
        if not license_name:
            raise ValueError("license is required for this source")
        if not bool(payload.get("approve_restricted")):
            raise ValueError("restricted licence requires approve_restricted=true")
    attribution = str(payload.get("attribution") or "").strip()
    if source.get("attribution_required") and not attribution:
        raise ValueError("attribution is required for this source")
    root = Path(project_path).resolve()
    inbox = ensure_layout(root) / "_inbox"
    suffix = Path(parsed.path).suffix.lower()
    if suffix not in ALLOWED_SUFFIXES:
        raise ValueError(f"unsupported asset suffix: {suffix or 'none'}")
    name = Path(parsed.path).name or ("asset" + suffix)
    name = "".join(c for c in name if c.isalnum() or c in "._- ").strip() or ("asset" + suffix)
    target = inbox / name
    if target.exists():
        target = inbox / (target.stem + "-" + time.strftime("%H%M%S") + target.suffix)
    req = urllib.request.Request(url, headers={"User-Agent": "LYGO-Forge-AssetBot/0.1"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            final_host = urllib.parse.urlparse(r.geturl()).hostname
            if final_host not in source.get("download_hosts", []):
                raise ValueError("redirected outside the allowlisted host")
            ctype = (r.headers.get("Content-Type") or "").lower()
            if suffix in (".png", ".jpg", ".jpeg", ".webp", ".gif") and not ctype.startswith("image/"):
                raise ValueError("remote content is not an image")
            length = int(r.headers.get("Content-Length") or 0)
            if length > MAX_FETCH_BYTES:
                raise ValueError("asset exceeds 20 MB limit")
            part = target.with_suffix(target.suffix + ".part")
            written = 0
            with part.open("wb") as f:
                while True:
                    chunk = r.read(1024 * 256)
                    if not chunk:
                        break
                    written += len(chunk)
                    if written > MAX_FETCH_BYTES:
                        part.unlink(missing_ok=True)
                        raise ValueError("asset exceeds 20 MB limit")
                    f.write(chunk)
            part.replace(target)
    except urllib.error.HTTPError as exc:
        raise ValueError(f"download failed: HTTP {exc.code}")
    except urllib.error.URLError as exc:
        raise ValueError(f"download failed: {exc.reason}")
    if not target.exists() or target.stat().st_size == 0:
        raise ValueError("download produced no file")
    record = add_pointer(project, str(root), {
        "kind": payload.get("kind") or "reference",
        "path": str(target),
        "source_url": url,
        "source_id": source_id,
        "license": license_name,
        "attribution": attribution,
        "hash": _hash(target),
        "owner": payload.get("owner") or "asset-bot",
        "task": payload.get("task") or "",
        "status": "candidate",
        "notes": payload.get("notes") or "Fetched into _inbox; requires human/tool acceptance.",
    })
    return {"asset": record, "bytes": target.stat().st_size, "source": source}


# --------------------------------------------------------------- asset folders
# The pointer registry above tracks individual files that were fetched or adopted.
# This registry tracks whole FOLDERS: where a game's art actually lives on disk,
# so agents stop re-discovering (or duplicating) the same asset trees.
FOLDERS_FILE = DATA / "asset_folders.json"
IMAGE_EXT = {".png", ".jpg", ".jpeg", ".webp", ".gif", ".tga", ".bmp", ".svg",
             ".psd", ".aseprite", ".ase", ".tiff", ".ico"}
FOLDER_HINTS = ("asset", "sprite", "tile", "art", "gfx", "texture", "render",
                "export", "frame", "icon", "pack", "sheet", "skeleton")
SCAN_PRUNE = {".git", "node_modules", ".venv", "venv", "__pycache__", ".cache",
              "appdata", "windows", "program files", "program files (x86)",
              "$recycle.bin", ".npm", "site-packages", ".next",
              # agent runtimes and screenshot piles are not game art
              ".grok", ".openclaw", ".hermes", ".claude", ".codex", ".dsh",
              "sessions", "screenshots", "camera roll", "image_cache", "audio_cache"}


def _load_folders() -> dict:
    if not FOLDERS_FILE.exists():
        return {"folders": []}
    try:
        return json.loads(FOLDERS_FILE.read_text(encoding="utf-8"))
    except Exception:
        return {"folders": []}


def _save_folders(data: dict) -> None:
    FOLDERS_FILE.parent.mkdir(parents=True, exist_ok=True)
    FOLDERS_FILE.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def measure(path: Path) -> dict:
    """Count images and bytes in a folder (non-recursive, cheap)."""
    images = 0
    total = 0
    newest = 0
    try:
        for child in path.iterdir():
            if not child.is_file() or child.suffix.lower() not in IMAGE_EXT:
                continue
            images += 1
            st = child.stat()
            total += st.st_size
            newest = max(newest, int(st.st_mtime))
    except OSError:
        pass
    return {"images": images, "mb": round(total / 1e6, 1), "newest": newest}


def folders(project: str | None = None) -> list[dict]:
    rows = _load_folders().get("folders", [])
    if project:
        rows = [r for r in rows if r.get("project") in (project, "*")]
    return sorted(rows, key=lambda r: (-r.get("images", 0), r.get("path", "")))


def register_folder(project: str, path: str, kind: str = "mixed", note: str = "",
                    label: str = "") -> dict:
    """Track a folder of game art. Idempotent: re-registering refreshes the counts."""
    p = Path(str(path)).expanduser()
    if not p.is_dir():
        raise ValueError(f"folder not found: {p}")
    p = p.resolve()
    m = measure(p)
    data = _load_folders()
    rows = data.setdefault("folders", [])
    key = str(p).lower()
    existing = next((r for r in rows if r.get("path", "").lower() == key), None)
    if existing:
        existing.update({"project": project or existing.get("project"), "kind": kind,
                         "label": label or existing.get("label") or p.name,
                         "note": note or existing.get("note", ""), **m})
        rec = existing
    else:
        rec = {"id": "AFD-" + uuid.uuid4().hex[:8], "path": str(p),
               "project": project, "kind": kind, "label": label or p.name,
               "note": note, "added": time.time(), **m}
        rows.append(rec)
    _save_folders(data)
    return rec


def unregister_folder(folder_id_or_path: str) -> bool:
    data = _load_folders()
    rows = data.get("folders", [])
    keep = [r for r in rows
            if r.get("id") != folder_id_or_path
            and r.get("path", "").lower() != str(folder_id_or_path).lower()]
    if len(keep) == len(rows):
        return False
    data["folders"] = keep
    _save_folders(data)
    return True


def discover(roots: list[str] | None = None, max_depth: int = 5,
             min_images: int = 5) -> list[dict]:
    """Read-only crawl for asset-looking folders. Nothing is registered."""
    import os as _os
    roots = roots or [r"D:\\", r"<USER>"]
    found = []
    for root in roots:
        if not _os.path.isdir(root):
            continue
        base = root.rstrip("\\").count(_os.sep)
        for dirpath, dirs, _files in _os.walk(root, onerror=lambda e: None):
            if dirpath.count(_os.sep) - base > max_depth:
                dirs[:] = []
                continue
            dirs[:] = [d for d in dirs if d.lower() not in SCAN_PRUNE and not d.startswith("$")]
            name = Path(dirpath).name.lower()
            m = measure(Path(dirpath))
            if m["images"] < min_images:
                continue
            if not (any(h in name for h in FOLDER_HINTS) or m["images"] >= 25):
                continue
            found.append({"path": dirpath, **m,
                          "known": any(r.get("path", "").lower() == dirpath.lower()
                                       for r in _load_folders().get("folders", []))})
    found.sort(key=lambda r: (-r["images"], -r["mb"]))
    return found

