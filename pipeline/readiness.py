#!/usr/bin/env python3
"""Forge production readiness probe. Read-only: starts no heavy jobs."""
from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(r"<FORGE_DIR>")
OUT = Path(r"<USER>\Documents\deepseek-harness\default-workspace\outbox\FORGE_READINESS.json")
CHECKS: list[dict] = []


def add(name: str, ok: bool, detail: str = "", required: bool = True) -> None:
    CHECKS.append({"name": name, "ok": bool(ok), "required": bool(required), "detail": str(detail)[:1200]})


def http(url: str, timeout: int = 8) -> tuple[bool, str]:
    try:
        import urllib.request
        with urllib.request.urlopen(url, timeout=timeout) as r:
            return 200 <= r.status < 300, f"HTTP {r.status}"
    except Exception as exc:  # noqa: BLE001
        return False, f"{type(exc).__name__}: {exc}"


def exists(path: str | Path, label: str, required: bool = True) -> bool:
    p = Path(path)
    add(label, p.exists(), str(p), required)
    return p.exists()


def main() -> int:
    add("python313", Path(r"C:\Python313\python.exe").exists(), sys.version.split()[0])
    exists(ROOT / "pipeline" / "gpu_lease.py", "gpu_lease")
    exists(ROOT / "pipeline" / "asset_vault.py", "asset_vault")
    exists(ROOT / "pipeline" / "release.py", "release")
    exists(ROOT / "pipeline" / "playtest_web.mjs", "playtest_web")
    exists(ROOT / "pipeline" / "playtest_unity.ps1", "playtest_unity")
    exists(ROOT / "pipeline" / "triposr.py", "triposr_wrapper")
    exists(ROOT / "pipeline" / "blender_prep.py", "blender_prep")

    tri = ROOT / "tools" / "TripoSR"
    exists(tri / ".venv" / "Scripts" / "python.exe", "triposr_venv")
    exists(tri / "weights" / "model.ckpt", "triposr_weights")
    if (tri / ".venv" / "Scripts" / "python.exe").exists():
        try:
            r = subprocess.run([str(tri / ".venv" / "Scripts" / "python.exe"), "-c", "import sys; sys.path.insert(0, r'<FORGE_DIR>\\tools\\TripoSR'); import torch, trimesh; from tsr.system import TSR; print(torch.__version__)"], capture_output=True, text=True, timeout=90)
            add("triposr_imports", r.returncode == 0, (r.stdout or r.stderr)[-400:])
        except Exception as exc:
            add("triposr_imports", False, str(exc))

    blender = Path(r"J:\SteamLibrary\steamapps\common\Blender\blender.exe")
    add("blender", blender.exists(), str(blender))
    if blender.exists():
        try:
            r = subprocess.run([str(blender), "--version"], capture_output=True, text=True, timeout=30)
            add("blender_version", "5.2" in (r.stdout or ""), (r.stdout or "").splitlines()[0] if r.stdout else "")
        except Exception as exc:
            add("blender_version", False, str(exc))

    for label, path in [
        ("godot", ROOT / "tools" / "Godot" / "Godot_v4.7.2-stable_win64.exe"),
        ("gltfpack", ROOT / "tools" / "gltfpack" / "gltfpack.exe"),
        ("threeui", ROOT / "tools" / "threeui" / "node_modules" / "@designcodeio" / "threeui" / "package.json"),
        ("jev", ROOT / "tools" / "jev-mcp" / "package.json"),
        ("blender_mcp_addon", Path(r"<USER>\AppData\Roaming\Blender Foundation\Blender\5.2\scripts\addons\blender_mcp.py")),
    ]:
        exists(path, label, required=False)

    add("forge_ui", *http("http://127.0.0.1:8796/api/status", 8))
    add("manager_ui", *http("http://127.0.0.1:8790/api/commander", 8))
    add("engine_bridge", *http("http://127.0.0.1:8081/v1/models", 8))
    add("console", *http("http://127.0.0.1:9641/", 8))

    # Dispatcher tool readiness from the live board.
    try:
        import urllib.request
        with urllib.request.urlopen("http://127.0.0.1:8796/api/dispatcher/agents", timeout=12) as r:
            agents = json.loads(r.read().decode("utf-8"))
        by = {a.get("id"): a for a in agents.get("agents", [])}
        for tid in ("triposr-local", "unity-build", "playtest-web", "release-pack"):
            a = by.get(tid) or {}
            add(f"worker:{tid}", a.get("status") == "ready", str(a.get("detail") or "missing"))
    except Exception as exc:
        for tid in ("triposr-local", "unity-build", "playtest-web", "release-pack"):
            add(f"worker:{tid}", False, str(exc))

    try:
        r = subprocess.run(["node", "-e", "require(process.env.PLAYWRIGHT_PATH || '<USER>/source/LYGOapps/node_modules/playwright'); console.log('playwright-ok')"], capture_output=True, text=True, timeout=45)
        add("playwright", r.returncode == 0 and "playwright-ok" in r.stdout, (r.stdout or r.stderr)[-300:])
    except Exception as exc:
        add("playwright", False, str(exc))

    required_fail = [c for c in CHECKS if c["required"] and not c["ok"]]
    result = {"ok": not required_fail, "checked_at": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(), "checks": CHECKS, "required_failures": required_fail}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"ok": result["ok"], "checks": len(CHECKS), "failed": [c["name"] for c in required_fail], "report": str(OUT)}, indent=2))
    return 0 if result["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
