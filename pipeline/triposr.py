#!/usr/bin/env python3
r"""Forge image-to-3D wrapper around the local TripoSR install.

CPU-first by default so the single Gemma engine can stay resident on the 8 GB
card. Use --gpu only when the engine is paused or the GPU lease is free.

Usage:
  python triposr.py --image input.png --out <PROJECTS>\demo\art\3d\hero --name hero
  python triposr.py --image input.png --out ... --gpu --lease-owner forge
"""
from __future__ import annotations

import argparse
import json
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TRIPO = ROOT / "tools" / "TripoSR"
PY = TRIPO / ".venv" / "Scripts" / "python.exe"
WEIGHTS = TRIPO / "weights"
RUN = TRIPO / "run.py"
LEASE = Path(__file__).with_name("gpu_lease.py")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--image", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--name", default="")
    ap.add_argument("--device", choices=["cpu", "cuda:0"], default="cpu")
    ap.add_argument("--mc-resolution", type=int, default=256)
    ap.add_argument("--chunk-size", type=int, default=8192)
    ap.add_argument("--bake-texture", action="store_true")
    ap.add_argument("--texture-resolution", type=int, default=2048)
    ap.add_argument("--gpu", action="store_true")
    ap.add_argument("--lease-owner", default="forge")
    args = ap.parse_args()

    image = Path(args.image).resolve()
    out = Path(args.out).resolve()
    if not image.is_file():
        print(json.dumps({"ok": False, "error": "image_missing", "image": str(image)}))
        return 2
    if not PY.exists() or not RUN.exists() or not (WEIGHTS / "model.ckpt").exists():
        print(json.dumps({"ok": False, "error": "triposr_incomplete", "python": str(PY), "weights": str(WEIGHTS)}))
        return 2
    out.mkdir(parents=True, exist_ok=True)
    device = "cuda:0" if args.gpu else args.device
    leased = False
    if device.startswith("cuda"):
        got = subprocess.run([sys.executable, str(LEASE), "acquire", "--owner", args.lease_owner, "--purpose", "triposr", "--minutes", "30"], capture_output=True, text=True)
        if got.returncode != 0:
            print(json.dumps({"ok": False, "error": "gpu_leased", "detail": got.stdout[-800:] + got.stderr[-400:]}))
            return 3
        leased = True
    cmd = [
        str(PY), str(RUN), str(image),
        "--device", device,
        "--pretrained-model-name-or-path", str(WEIGHTS),
        "--output-dir", str(out),
        "--model-save-format", "glb",
        "--mc-resolution", str(args.mc_resolution),
        "--chunk-size", str(args.chunk_size),
    ]
    if args.bake_texture:
        cmd += ["--bake-texture", "--texture-resolution", str(args.texture_resolution)]
    started = datetime.now(timezone.utc).isoformat()
    proc = subprocess.run(cmd, cwd=str(TRIPO), capture_output=True, text=True, timeout=1800)
    if leased:
        subprocess.run([sys.executable, str(LEASE), "release", "--owner", args.lease_owner], capture_output=True, text=True)

    candidates = sorted(out.rglob("*.glb"), key=lambda p: p.stat().st_mtime, reverse=True)
    mesh = candidates[0] if candidates else None
    meta = {
        "ok": proc.returncode == 0 and mesh is not None,
        "started": started,
        "device": device,
        "model": "TripoSR (MIT)",
        "input": str(image),
        "output": str(out),
        "mesh": str(mesh) if mesh else None,
        "mesh_bytes": mesh.stat().st_size if mesh else 0,
        "command": cmd,
        "returncode": proc.returncode,
        "log_tail": (proc.stdout or "")[-1600:],
        "error_tail": (proc.stderr or "")[-1600:],
        "note": "Mesh is an unrigged base mesh. Retopo/cleanup and Mixamo/Rigify are separate stages.",
    }
    (out / "triposr.json").write_text(json.dumps(meta, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: meta[k] for k in ("ok", "mesh", "mesh_bytes", "device", "returncode")}, indent=2))
    return 0 if meta["ok"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
