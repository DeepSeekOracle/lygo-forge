#!/usr/bin/env python3
"""Generate 300 unique archive image plates as SVG + a browser manifest.

This is a deterministic asset factory, not a hand-drawn set. Each plate uses a
different palette, composition and archive label. No third-party imagery.
"""
from __future__ import annotations

import json
import re
from pathlib import Path

OUT = Path(r"<USER>\source\chatagent\games\haven-desk\assets\plates")
JS = Path(r"<USER>\source\chatagent\games\haven-desk\veil-plates.js")
TITLES = [
    "Signal Room", "Dead Letter Office", "The Long Corridor", "Harbor Schematic",
    "Night Index", "Concrete Psalm", "Lattice Fragment", "Visitor Pass",
    "Candle Archive", "The Quiet Engine", "Error Garden", "Memory Silt",
    "Relay Diagram", "The Last Console", "Private Date", "Open Ledger",
    "Packet Rain", "The Glass Rectangle", "Deep Blue Board", "The First Door",
    "Cold Boot", "The Cat on the Keys", "Archive Ring", "Third Scale",
    "Harmony Threshold", "Mirror Room", "Test Pattern", "Night Wire",
    "The Missing Year", "Room 14", "The Second Visitor", "Afterimage",
    "Paper Moon", "The Long Count", "Signal Floor", "One Candle",
    "The Twelfth Chair", "Entropy Garden", "The Open Room", "Lattice Corridor",
]
PALETTES = [
    ("#07110f", "#0f2a24", "#72e0d1", "#e0b35a", "#e9e2cf"),
    ("#0d0b08", "#251b0d", "#e0b35a", "#9fe58c", "#f4efe0"),
    ("#080b14", "#111d2e", "#8cb9e8", "#e8785e", "#e7ecf2"),
    ("#100b0d", "#2a1213", "#e8785e", "#e0b35a", "#efd8d2"),
    ("#0b120b", "#1d2c1a", "#9fe58c", "#d4a64d", "#e7eedb"),
    ("#0a1010", "#1d2b28", "#b8c9c1", "#72e0d1", "#eef2ed"),
]
MOTIFS = ["rings", "grid", "bars", "spiral", "constellation", "stack", "wave", "frame"]


def plate_svg(n: int) -> str:
    date = f"{1969 + (n * 7) % 77:04d}-{1 + n % 12:02d}-{1 + n % 28:02d}"
    title = TITLES[(n - 1) % len(TITLES)]
    bg, panel, accent, warm, ink = PALETTES[(n - 1) % len(PALETTES)]
    motif = MOTIFS[(n - 1) % len(MOTIFS)]
    c = panel
    art = []
    if motif == "rings":
        for i in range(7):
            r = 42 + i * 18
            art.append(f'<circle cx="470" cy="188" r="{r}" fill="none" stroke="{accent}" stroke-opacity="{0.12 + i * 0.045:.2f}" stroke-width="1"/>')
    elif motif == "grid":
        for x in range(300, 620, 32):
            art.append(f'<line x1="{x}" y1="42" x2="{x}" y2="318" stroke="{accent}" stroke-opacity=".12"/>')
        for y in range(60, 320, 24):
            art.append(f'<line x1="300" y1="{y}" x2="620" y2="{y}" stroke="{accent}" stroke-opacity=".09"/>')
    elif motif == "bars":
        for i in range(9):
            h = 24 + ((n * 13 + i * 37) % 150)
            art.append(f'<rect x="{300 + i * 34}" y="{318 - h}" width="18" height="{h}" fill="{accent}" opacity="{0.12 + (i % 3) * .06:.2f}"/>')
    elif motif == "spiral":
        for i in range(34):
            import math
            a = i * .55
            x = 470 + math.cos(a) * (15 + i * 3.2)
            y = 188 + math.sin(a) * (15 + i * 2.1)
            art.append(f'<rect x="{x:.1f}" y="{y:.1f}" width="3" height="3" fill="{warm if i % 5 == 0 else accent}" opacity=".55"/>')
    elif motif == "constellation":
        pts = [(330 + (i * 37) % 260, 70 + (i * 53) % 220) for i in range(13)]
        for i, (x, y) in enumerate(pts):
            art.append(f'<circle cx="{x}" cy="{y}" r="{2 + i % 3}" fill="{warm if i % 4 == 0 else accent}" opacity=".7"/>')
            if i:
                x0, y0 = pts[i - 1]
                art.append(f'<line x1="{x0}" y1="{y0}" x2="{x}" y2="{y}" stroke="{accent}" stroke-opacity=".18"/>')
    elif motif == "stack":
        for i in range(6):
            art.append(f'<rect x="{314 + i * 7}" y="{90 + i * 27}" width="{276 - i * 14}" height="16" fill="{accent}" opacity="{0.08 + i * .025:.2f}"/>')
    elif motif == "wave":
        pts = " ".join(f"{300 + i * 8},{190 + int(46 * __import__('math').sin(i * .4 + n))}" for i in range(41))
        art.append(f'<polyline points="{pts}" fill="none" stroke="{accent}" stroke-width="2" stroke-opacity=".55"/>')
    else:
        art.append(f'<rect x="300" y="52" width="300" height="246" fill="none" stroke="{accent}" stroke-opacity=".27"/>')
        art.append(f'<rect x="314" y="66" width="272" height="218" fill="none" stroke="{warm}" stroke-opacity=".15"/>')
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360" role="img" aria-label="{title}, archive plate {n:03d}">
<defs><linearGradient id="g{n}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{bg}"/><stop offset=".62" stop-color="{panel}"/><stop offset="1" stop-color="#030706"/></linearGradient></defs>
<rect width="640" height="360" fill="url(#g{n})"/>
<rect x="24" y="24" width="592" height="312" fill="none" stroke="{accent}" stroke-opacity=".28"/>
<rect x="36" y="36" width="568" height="288" fill="none" stroke="{warm}" stroke-opacity=".12"/>
<text x="48" y="58" fill="{warm}" font-family="Courier New, monospace" font-size="9" letter-spacing="3">LYGO TEMPORAL ARCHIVE</text>
<text x="592" y="58" text-anchor="end" fill="{accent}" font-family="Courier New, monospace" font-size="9">PLATE {n:03d}</text>
{''.join(art)}
<line x1="48" y1="302" x2="592" y2="302" stroke="{accent}" stroke-opacity=".3"/>
<text x="48" y="322" fill="{ink}" font-family="Courier New, monospace" font-size="12" opacity=".9">{title.upper()}</text>
<text x="592" y="322" text-anchor="end" fill="{warm}" font-family="Courier New, monospace" font-size="10">{date}</text>
</svg>'''


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    items = []
    for i in range(1, 301):
        name = f"plate-{i:03d}.svg"
        (OUT / name).write_text(plate_svg(i), encoding="utf-8")
        items.append({
            "id": f"plate-{i:03d}",
            "src": f"assets/plates/{name}",
            "title": TITLES[(i - 1) % len(TITLES)] + f" · {i:03d}",
            "date": f"{1969 + (i * 7) % 77:04d}-{1 + i % 12:02d}-{1 + i % 28:02d}",
        })
    JS.write_text(
        "/* Generated by haven_plates.py. 300 original SVG archive plates. */\n"
        "window.VEIL_PLATES = " + json.dumps(items, ensure_ascii=False, indent=2) + ";\n",
        encoding="utf-8",
    )
    print(json.dumps({"ok": True, "plates": len(items), "dir": str(OUT), "manifest": str(JS)}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
