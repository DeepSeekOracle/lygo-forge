"""Production workflow map for Forge roles and stages."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DATA_FILE = ROOT / "workflow" / "game-production.json"


def load() -> dict:
    return json.loads(DATA_FILE.read_text(encoding="utf-8"))


def stages() -> list[dict]:
    return load().get("stages", [])


def roles() -> dict:
    return load().get("roles", {})


def role(role_id: str) -> dict | None:
    return roles().get(role_id)


def stage(stage_id: str) -> dict | None:
    return next((s for s in stages() if s["id"] == stage_id), None)


PHASE_MAP = {
    "Intake": "direction",
    "Concept": "concept",
    "Design": "design",
    "Art Bible": "art-bible",
    "Technical Plan": "design",
    "Vertical Slice": "vertical-slice",
    "Production": "production",
    "QA": "qa-polish",
    "Release": "release",
    "intake": "direction",
    "concept": "concept",
    "design": "design",
    "art": "art-bible",
    "slice": "vertical-slice",
    "production": "production",
    "qa": "qa-polish",
    "release": "release",
}

OWNER_MAP = {
    "producer": "producer",
    "game-director": "game-director",
    "game-designer": "game-designer",
    "systems-designer": "systems-designer",
    "level-designer": "level-designer",
    "narrative-designer": "narrative-designer",
    "ux-designer": "ux-designer",
    "art-director": "art-director",
    "concept-artist": "concept-artist",
    "2d-artist": "2d-artist",
    "3d-artist": "3d-modeler",
    "3d-modeler": "3d-modeler",
    "technical-artist": "technical-artist",
    "tech-artist": "technical-artist",
    "animator": "animator",
    "vfx-artist": "vfx-artist",
    "audio-designer": "audio-designer",
    "gameplay-engineer": "gameplay-engineer",
    "unity-engineer": "gameplay-engineer",
    "web-engineer": "gameplay-engineer",
    "ui-programmer": "ui-programmer",
    "tools-engineer": "tools-engineer",
    "qa-lead": "qa-lead",
    "qa": "qa-lead",
    "performance-engineer": "performance-engineer",
    "asset-scout": "asset-scout",
    "localization-accessibility": "localization-accessibility",
    "release-engineer": "release-engineer",
}


def role_for_owner(owner: str) -> str:
    return OWNER_MAP.get((owner or "").strip().lower(), "game-designer")


def skill_for_owner(owner: str) -> str:
    r = role(role_for_owner(owner))
    return (r or {}).get("skill", "forge-worker")


def stage_for_phase(phase: str) -> str:
    return PHASE_MAP.get((phase or "").strip(), "production")


TASK_PREFIX = {
    "INTAKE": "direction",
    "CONCEPT": "concept",
    "GDD": "design",
    "DESIGN": "design",
    "ART": "art-bible",
    "SLICE": "vertical-slice",
    "PROD": "production",
    "QA": "qa-polish",
    "REL": "release",
}


def stage_for_task(task: dict) -> str:
    phase = (task or {}).get("phase") or ""
    if phase in PHASE_MAP:
        return PHASE_MAP[phase]
    prefix = str((task or {}).get("id") or "").split("-")[0].upper()
    return TASK_PREFIX.get(prefix, "production")


def role_brief(role_id: str, stage_id: str = "") -> str:
    r = role(role_id)
    s = stage(stage_id) if stage_id else None
    if not r:
        return ""
    parts = [
        f"ROLE: {r.get('title', role_id)}",
        f"MISSION: {r.get('mission', '')}",
        "TOOLS: " + ", ".join(r.get("tools", [])),
        "OUTPUTS: " + "; ".join(r.get("outputs", [])),
        "ACCEPTANCE: " + "; ".join(r.get("acceptance", [])),
        "NEVER: " + "; ".join(r.get("never", [])),
        "HANDOFF TO: " + ", ".join(r.get("handoff_to", [])),
    ]
    if s:
        parts += [
            f"STAGE: {s.get('title')} ({s.get('phase')})",
            f"STAGE GOAL: {s.get('goal')}",
            f"STAGE GATE: {s.get('gate')}",
        ]
    return "\n".join(parts)


def summary() -> dict:
    d = load()
    return {
        "version": d.get("version"),
        "source_note": d.get("source_note"),
        "phases": d.get("phases", []),
        "stage_count": len(d.get("stages", [])),
        "role_count": len(d.get("roles", {})),
        "stages": d.get("stages", []),
        "roles": d.get("roles", {}),
        "tool_map": d.get("tool_map", {}),
    }
