#!/usr/bin/env python3
"""Forge audio batch renderer — deterministic Piper TTS + synthesized SFX.

A writer worker only produces JSON specs. This tool renders and verifies the
files. It is intentionally not a free-form shell: voices and SFX presets are
allowlisted, output paths are confined to the project's assets/voice and
assets/sfx directories, and every artifact gets a hash/duration sidecar.

Brief schema:
{
  "items": [
    {"kind":"tts","id":"line-01","voice":"male","text":"...", "out":"assets/voice/line-01.wav"},
    {"kind":"sfx","id":"portal-01","preset":"portal","out":"assets/sfx/portal-01.wav"}
  ],
  "overwrite": false
}
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import os
import random
import struct
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

PIPER = Path(r"<MEDIA>\tools\piper\piper.exe")
VOICES = {
    "female": Path(r"<MEDIA>\models\voices\en_US-ljspeech-high.onnx"),
    "female_alt": Path(r"<MEDIA>\models\voices\en_US-lessac-medium.onnx"),
    "archivist": Path(r"<MEDIA>\models\voices\en_GB-alba-medium.onnx"),
    "male": Path(r"<MEDIA>\models\voices\en_US-ryan-high.onnx"),
}
RATE = 22050


def _inside(root: Path, candidate: Path, allowed: tuple[str, ...]) -> bool:
    try:
        rel = candidate.resolve().relative_to(root.resolve())
    except ValueError:
        return False
    return any(rel.parts[0] == a for a in allowed)


def _sha(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def _validate_wav(path: Path) -> dict:
    with wave.open(str(path), "rb") as w:
        rate = w.getframerate()
        channels = w.getnchannels()
        width = w.getsampwidth()
        frames = w.getnframes()
    seconds = frames / float(rate) if rate else 0
    if channels != 1 or width != 2:
        raise ValueError(f"{path.name}: expected mono 16-bit, got {channels}ch/{width * 8}bit")
    if not (0.1 <= seconds <= 20):
        raise ValueError(f"{path.name}: duration {seconds:.2f}s outside 0.1–20s")
    return {"rate": rate, "channels": channels, "width": width, "seconds": round(seconds, 3)}


def _tts(text: str, voice: str, out: Path, timeout: int = 120) -> dict:
    if voice not in VOICES:
        raise ValueError(f"voice not allowlisted: {voice}")
    model = VOICES[voice]
    if not PIPER.exists() or not model.exists():
        raise RuntimeError(f"Piper/model missing for {voice}")
    tmp = out.with_suffix(".tmp.wav")
    proc = subprocess.run(
        [str(PIPER), "-m", str(model), "-f", str(tmp)],
        input=text.encode("utf-8"),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        timeout=timeout,
    )
    if proc.returncode != 0 or not tmp.exists() or tmp.stat().st_size < 1000:
        tmp.unlink(missing_ok=True)
        raise RuntimeError(f"Piper failed for {out.name}: {proc.stderr.decode('utf-8', 'replace')[-500:]}")
    os.replace(tmp, out)
    return {"kind": "tts", "voice": voice}


def _write_wav(path: Path, seconds: float, fn) -> None:
    n = int(RATE * seconds)
    rand = random.Random(42)
    with wave.open(str(path), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        frames = bytearray()
        for i in range(n):
            t = i / RATE
            v = max(-1.0, min(1.0, fn(t, rand)))
            frames += struct.pack("<h", int(v * 32767))
        w.writeframes(bytes(frames))


def _sfx(preset: str, out: Path) -> dict:
    presets = {
        "room-hum": (9.0, lambda t, r: .10 * math.sin(2 * math.pi * 55 * t) + .035 * math.sin(2 * math.pi * 110 * t) + .018 * math.sin(2 * math.pi * 220 * t)),
        "static": (5.0, lambda t, r: r.uniform(-1, 1) * .10 * (.5 + .5 * math.sin(2 * math.pi * 1.3 * t))),
        "beep": (0.22, lambda t, r: .20 * math.sin(2 * math.pi * 880 * t) * math.exp(-18 * t)),
        "chime": (1.8, lambda t, r: .16 * math.sin(2 * math.pi * 660 * t) * math.exp(-2.4 * t) + .10 * math.sin(2 * math.pi * 990 * t) * math.exp(-3.1 * t)),
        "error": (0.8, lambda t, r: .16 * math.sin(2 * math.pi * 140 * t) * (1 if int(t * 8) % 2 == 0 else .2)),
        "portal": (4.2, lambda t, r: .13 * math.sin(2 * math.pi * (90 + t * 105) * t) + .05 * math.sin(2 * math.pi * (180 + t * 70) * t) + .03 * r.uniform(-1, 1)),
        "candle": (4.0, lambda t, r: .08 * math.sin(2 * math.pi * 170 * t) + .04 * math.sin(2 * math.pi * 310 * t) * (.6 + .4 * math.sin(2 * math.pi * 3.7 * t))),
        "type": (0.16, lambda t, r: .12 * r.uniform(-1, 1) * math.exp(-70 * t)),
        "rain": (5.0, lambda t, r: .04 * r.uniform(-1, 1) + .025 * math.sin(2 * math.pi * 900 * t)),
        "modem": (3.2, lambda t, r: .11 * math.sin(2 * math.pi * (300 + 900 * abs(math.sin(t * 2.2))) * t) + .03 * r.uniform(-1, 1)),
        "unseal": (1.4, lambda t, r: .12 * math.sin(2 * math.pi * 523 * t) * math.exp(-1.2 * t) + .10 * math.sin(2 * math.pi * 784 * t) * math.exp(-1.6 * t)),
        "click": (0.10, lambda t, r: .15 * math.sin(2 * math.pi * 2200 * t) * math.exp(-90 * t)),
        "whisper": (3.2, lambda t, r: .035 * r.uniform(-1, 1) * (.3 + .7 * abs(math.sin(2 * math.pi * .3 * t))) + .02 * math.sin(2 * math.pi * 180 * t)),
        "paper": (0.45, lambda t, r: .08 * r.uniform(-1, 1) * math.exp(-6 * t)),
        "switch": (0.12, lambda t, r: .12 * math.sin(2 * math.pi * 1200 * t) * math.exp(-35 * t)),
        "radio": (3.0, lambda t, r: .05 * math.sin(2 * math.pi * (440 + 20 * math.sin(2 * math.pi * .7 * t)) * t) + .02 * r.uniform(-1, 1)),
        "door": (1.4, lambda t, r: .12 * math.sin(2 * math.pi * 70 * t) * math.exp(-1.8 * t) + .04 * r.uniform(-1, 1)),
        "breath": (3.0, lambda t, r: .045 * r.uniform(-1, 1) * (.5 + .5 * math.sin(2 * math.pi * .5 * t))),
        "glitch": (1.2, lambda t, r: .10 * math.sin(2 * math.pi * (90 + 900 * int(t * 12) % 300) * t) * (.3 + .7 * r.random())),
        "distant-voice": (4.0, lambda t, r: .05 * math.sin(2 * math.pi * 220 * t) + .025 * math.sin(2 * math.pi * 330 * t) + .02 * r.uniform(-1, 1)),
    }
    if preset not in presets:
        raise ValueError(f"sfx preset not allowlisted: {preset}")
    seconds, fn = presets[preset]
    _write_wav(out, seconds, fn)
    return {"kind": "sfx", "preset": preset}


def render(project: Path, brief: dict) -> dict:
    project = project.resolve()
    if not project.exists():
        raise RuntimeError(f"project not found: {project}")
    items = brief.get("items")
    if not isinstance(items, list) or not items or len(items) > 80:
        raise ValueError("items must be an array of 1–80 items")
    overwrite = bool(brief.get("overwrite", False))
    results = []
    for item in items:
        if not isinstance(item, dict):
            raise ValueError("each item must be an object")
        out = Path(str(item.get("out") or ""))
        if not out.is_absolute():
            out = project / out
        if not _inside(project, out, ("assets",)):
            raise ValueError(f"output outside project assets: {out}")
        if not (str(out).replace("\\", "/").find("/assets/voice/") >= 0 or str(out).replace("\\", "/").find("/assets/sfx/") >= 0):
            raise ValueError(f"output must be under assets/voice or assets/sfx: {out}")
        out.parent.mkdir(parents=True, exist_ok=True)
        if out.exists() and not overwrite:
            raise ValueError(f"refusing to overwrite (set overwrite=true): {out}")
        tmp = out.with_suffix(".tmp.wav")
        try:
            if item.get("kind") == "tts":
                text = str(item.get("text") or "").strip()
                if not (1 <= len(text) <= 1200):
                    raise ValueError("tts text must be 1–1200 chars")
                meta = _tts(text, str(item.get("voice") or "female"), tmp)
            elif item.get("kind") == "sfx":
                meta = _sfx(str(item.get("preset") or ""), tmp)
            else:
                raise ValueError("kind must be tts or sfx")
            info = _validate_wav(tmp)
            os.replace(tmp, out)
            sidecar = out.with_suffix(out.suffix + ".json")
            payload = {
                "id": item.get("id", out.stem),
                "path": str(out.relative_to(project)).replace("\\", "/"),
                "bytes": out.stat().st_size,
                "sha256": _sha(out),
                **meta,
                **info,
                "engine": "piper" if meta["kind"] == "tts" else "forge-synth",
                "text": item.get("text") if meta["kind"] == "tts" else None,
            }
            sidecar.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
            results.append(payload)
        finally:
            tmp.unlink(missing_ok=True)
    return {"ok": True, "artifacts": results, "project": str(project)}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--project", required=True)
    ap.add_argument("--brief", required=True, help="JSON string or path to JSON")
    args = ap.parse_args()
    raw = args.brief
    if Path(raw).is_file():
        brief = json.loads(Path(raw).read_text(encoding="utf-8"))
    else:
        brief = json.loads(raw)
    try:
        print(json.dumps(render(Path(args.project), brief), indent=2))
        return 0
    except Exception as exc:
        print(json.dumps({"ok": False, "error": f"{type(exc).__name__}: {exc}"}, indent=2), file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
