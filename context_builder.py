"""Build a compact project context packet for Forge jobs.

The packet is the worker's only source of project truth. It is deliberately
bounded and contains no secrets.
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DOCS = [
    ("GAME.md", 2200),
    ("PLAN.md", 1200),
    ("TECH_SPEC.md", 1400),
    ("ART_BIBLE.md", 1200),
    ("ASSET_PLAN.md", 1000),
    ("QA.md", 900),
]


def _read(path: Path, limit: int) -> str:
    try:
        text = path.read_text(encoding="utf-8-sig")
    except Exception:
        return ""
    return text[:limit]


def build(project_path: str | Path, task_id: str = "", max_chars: int = 14000) -> str:
    root = Path(project_path)
    lines = ["PROJECT CONTEXT (authoritative; do not invent beyond this)", f"Project: {root.name}", f"Path: {root}"]
    for name, limit in DOCS:
        text = _read(root / name, limit)
        if text.strip():
            lines.append(f"\n### {name}\n{text.strip()}")
    tasks_file = root / "TASKS.json"
    task = None
    tasks = []
    try:
        tasks = json.loads(tasks_file.read_text(encoding="utf-8-sig")).get("tasks", [])
        task = next((t for t in tasks if t.get("id") == task_id), None)
    except Exception:
        pass
    if task:
        deps = task.get("depends_on", [])
        by_id = {t.get("id"): t for t in tasks}
        missing = [d for d in deps if by_id.get(d, {}).get("status") != "done"]
        gate = "OPEN" if not missing else "BLOCKED: " + ", ".join(missing)
        lines.append("\n### SELECTED TASK\n" + json.dumps(task, indent=2)[:5000])
        lines.append(f"\nDEPENDENCY GATE: {gate}")
        lines.append("Evidence rules: report only what the supplied context and tests prove. "
                     "Do not claim to inspect files or run tools you do not have.")
        if missing:
            lines.append("This task is dependency-blocked; do not mark it done.")
    else:
        lines.append("\n### TASK QUEUE\n" + json.dumps(tasks[:30], indent=2)[:6000])
    text = "\n".join(lines)
    return text[:max_chars]
