#!/usr/bin/env python3
"""Cross-process GPU job lease for LYGO Forge.

A lease is an atomic JSON file. It prevents Blender, ComfyUI, Wan and other
heavy GPU jobs from starting at the same time. The lease expires so a crashed
job cannot wedge the machine forever.

This is deliberately filesystem-only: no daemon, no port, no credentials.

Usage:
  python gpu_lease.py status
  python gpu_lease.py acquire --owner forge --purpose blender --minutes 30
  python gpu_lease.py release --owner forge
  python gpu_lease.py wait --owner forge --purpose triposr --minutes 60
"""
from __future__ import annotations

import argparse
import json
import os
import socket
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

LEASE = Path(os.environ.get("LYGO_GPU_LEASE", r"<DRIVE_D>\LYGO_SHARED\engine\gpu.lease.json"))
DEFAULT_MINUTES = 30


def now() -> datetime:
    return datetime.now(timezone.utc)


def iso(dt: datetime) -> str:
    return dt.isoformat().replace("+00:00", "Z")


def read() -> dict | None:
    try:
        data = json.loads(LEASE.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else None
    except (FileNotFoundError, json.JSONDecodeError, OSError):
        return None


def expired(lease: dict) -> bool:
    try:
        expires = datetime.fromisoformat(str(lease.get("expires", "")).replace("Z", "+00:00"))
        return expires <= now()
    except ValueError:
        return True


def status() -> dict:
    lease = read()
    if not lease:
        return {"held": False, "lease": None, "path": str(LEASE)}
    if expired(lease):
        return {"held": False, "expired": True, "lease": lease, "path": str(LEASE)}
    return {"held": True, "lease": lease, "path": str(LEASE)}


def acquire(owner: str, purpose: str, minutes: int) -> dict:
    LEASE.parent.mkdir(parents=True, exist_ok=True)
    current = read()
    if current and not expired(current):
        return {"ok": False, "held_by": current, "reason": "gpu_busy"}
    payload = {
        "owner": owner,
        "purpose": purpose,
        "host": socket.gethostname(),
        "pid": os.getpid(),
        "acquired": iso(now()),
        "expires": iso(now() + timedelta(minutes=max(1, minutes))),
        "version": 1,
    }
    tmp = LEASE.with_suffix(".tmp")
    tmp.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    # Atomic replace. Two racing writers can both replace, so re-read and
    # confirm the winner is this lease; the loser backs off.
    try:
        os.replace(tmp, LEASE)
    except OSError as exc:
        return {"ok": False, "reason": f"write_failed: {exc}"}
    current = read()
    if not current or current.get("pid") != payload["pid"] or current.get("owner") != owner:
        return {"ok": False, "reason": "race_lost", "held_by": current}
    return {"ok": True, "lease": current}


def release(owner: str) -> dict:
    current = read()
    if not current:
        return {"ok": True, "released": False, "reason": "no_lease"}
    if current.get("owner") != owner:
        return {"ok": False, "reason": "not_owner", "held_by": current}
    try:
        LEASE.unlink()
    except FileNotFoundError:
        pass
    return {"ok": True, "released": True}


def wait_for(owner: str, purpose: str, minutes: int, timeout_s: int) -> dict:
    deadline = time.time() + timeout_s
    while True:
        got = acquire(owner, purpose, minutes)
        if got.get("ok"):
            return got
        if time.time() >= deadline:
            return {"ok": False, "reason": "timeout", "held_by": got.get("held_by") or got.get("lease")}
        time.sleep(3)


def main() -> int:
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)

    sub.add_parser("status")

    a = sub.add_parser("acquire")
    a.add_argument("--owner", required=True)
    a.add_argument("--purpose", required=True)
    a.add_argument("--minutes", type=int, default=DEFAULT_MINUTES)

    r = sub.add_parser("release")
    r.add_argument("--owner", required=True)

    w = sub.add_parser("wait")
    w.add_argument("--owner", required=True)
    w.add_argument("--purpose", required=True)
    w.add_argument("--minutes", type=int, default=60)
    w.add_argument("--timeout", type=int, default=1800)

    args = ap.parse_args()
    if args.cmd == "status":
        out = status()
    elif args.cmd == "acquire":
        out = acquire(args.owner, args.purpose, args.minutes)
    elif args.cmd == "release":
        out = release(args.owner)
    else:
        out = wait_for(args.owner, args.purpose, args.minutes, args.timeout)
    print(json.dumps(out, indent=2))
    return 0 if (out.get("ok") or out.get("held") is not None) else 1


if __name__ == "__main__":
    raise SystemExit(main())
