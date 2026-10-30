"""Per-skill agent notes and task events.

The central JSON log is authoritative; a Markdown mirror is written into the
target skill folder so humans and agents can read it without the API.
"""
from __future__ import annotations

import json
import os
import re
import time
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SKILLS_DIR = Path(os.environ.get("LYGO_FORGE_SKILLS", r"<FORGE_DIR>\skills"))
DATA = Path(os.environ.get("LYGO_FORGE_DATA", r"<FORGE_DIR>\data"))
NOTES_DIR = DATA / "skill-notes"

KINDS = {"task", "handoff", "asset", "question", "blocker", "done", "note", "approval"}


def _safe_skill(skill: str) -> str:
    skill = (skill or "").strip()
    if not re.match(r"^forge-[a-z0-9-]+$", skill):
        raise ValueError("invalid skill id")
    if not (SKILLS_DIR / skill).is_dir():
        raise ValueError("skill not found")
    return skill


def ensure_layout(skill: str) -> Path:
    skill = _safe_skill(skill)
    base = SKILLS_DIR / skill
    for name in ("notes", "assets/inbox", "assets/outbox", "handoffs"):
        (base / name).mkdir(parents=True, exist_ok=True)
    (NOTES_DIR / skill).mkdir(parents=True, exist_ok=True)
    return base


def _index(skill: str) -> list[dict]:
    p = NOTES_DIR / skill / "index.json"
    if not p.exists():
        return []
    try:
        return json.loads(p.read_text(encoding="utf-8")).get("notes", [])
    except Exception:
        return []


def _save_index(skill: str, notes: list[dict]) -> None:
    p = NOTES_DIR / skill / "index.json"
    p.write_text(json.dumps({"skill": skill, "notes": notes}, indent=2) + "\n", encoding="utf-8")


def add_note(skill: str, payload: dict) -> dict:
    skill_id = _safe_skill(skill)
    base = ensure_layout(skill_id)
    message = str(payload.get("message") or payload.get("note") or "").strip()
    if not message:
        raise ValueError("message required")
    if len(message) > 8000:
        raise ValueError("message too long")
    kind = str(payload.get("kind") or "note").lower()
    if kind not in KINDS:
        raise ValueError("invalid note kind")
    sender = str(payload.get("from") or "unknown").strip()[:80]
    now = time.time()
    note_id = "NOTE-" + time.strftime("%Y%m%d-%H%M%S") + "-" + uuid.uuid4().hex[:6]
    note = {
        "id": note_id,
        "time": now,
        "time_iso": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "skill": skill_id,
        "from": sender,
        "to": str(payload.get("to") or skill_id),
        "kind": kind,
        "job": str(payload.get("job") or ""),
        "message": message,
        "paths": [str(p) for p in (payload.get("paths") or [])][:20],
        "meta": payload.get("meta") if isinstance(payload.get("meta"), dict) else {},
        "requires_action": bool(payload.get("requires_action", kind in ("question", "blocker", "handoff", "approval"))),
        "resolution": None if kind == "approval" else "",
        "resolved_by": "",
        "resolved_at": None,
        "resolution_note": "",
        "read_by": [],
    }
    central = NOTES_DIR / skill_id / f"{note_id}.json"
    central.write_text(json.dumps(note, indent=2) + "\n", encoding="utf-8")
    notes = _index(skill_id)
    notes.append(note)
    _save_index(skill_id, notes)
    day = time.strftime("%Y-%m-%d")
    mirror_dir = base / "notes" / day
    mirror_dir.mkdir(parents=True, exist_ok=True)
    lines = [
        f"# {note_id}",
        "",
        f"- **Time:** {note['time_iso']}",
        f"- **From:** {sender}",
        f"- **To:** {note['to']}",
        f"- **Kind:** {kind}",
        f"- **Job:** {note['job'] or '—'}",
        f"- **Requires action:** {note['requires_action']}",
    ]
    if note["paths"]:
        lines.append("- **Paths:** " + ", ".join(f"`{p}`" for p in note["paths"]))
    lines += ["", "## Message", "", message, ""]
    (mirror_dir / f"{note_id}.md").write_text("\n".join(lines), encoding="utf-8")
    return note


def list_notes(skill: str, unread_only: bool = False) -> list[dict]:
    skill = _safe_skill(skill)
    notes = _index(skill)
    if unread_only:
        notes = [n for n in notes if not n.get("read_by")]
    return sorted(notes, key=lambda n: n.get("time", 0), reverse=True)


def mark_read(skill: str, note_id: str, reader: str = "operator") -> dict:
    skill = _safe_skill(skill)
    notes = _index(skill)
    note = next((n for n in notes if n.get("id") == note_id), None)
    if not note:
        raise ValueError("note not found")
    readers = note.setdefault("read_by", [])
    if reader not in readers:
        readers.append(reader)
    _save_index(skill, notes)
    central = NOTES_DIR / skill / f"{note_id}.json"
    central.write_text(json.dumps(note, indent=2) + "\n", encoding="utf-8")
    return note


def list_approvals() -> list[dict]:
    out = []
    for skill_dir in sorted(SKILLS_DIR.glob("forge-*")):
        if not skill_dir.is_dir():
            continue
        try:
            for note in _index(skill_dir.name):
                if note.get("kind") == "approval" and not note.get("resolution"):
                    out.append({**note, "skill": skill_dir.name})
        except Exception:
            continue
    return sorted(out, key=lambda n: n.get("time", 0), reverse=True)


def resolve_note(skill: str, note_id: str, payload: dict) -> dict:
    skill = _safe_skill(skill)
    decision = str(payload.get("decision") or "").lower()
    if decision not in ("approved", "rejected"):
        raise ValueError("decision must be approved or rejected")
    notes = _index(skill)
    note = next((n for n in notes if n.get("id") == note_id), None)
    if not note:
        raise ValueError("note not found")
    if note.get("kind") != "approval":
        raise ValueError("note is not an approval request")
    if note.get("resolution"):
        raise ValueError("approval already resolved")
    now = time.time()
    note["resolution"] = decision
    note["resolved_by"] = str(payload.get("by") or "operator")[:80]
    note["resolved_at"] = now
    note["resolution_note"] = str(payload.get("note") or "")[:4000]
    note["requires_action"] = False
    if note["resolved_by"] not in note.get("read_by", []):
        note.setdefault("read_by", []).append(note["resolved_by"])
    _save_index(skill, notes)
    central = NOTES_DIR / skill / f"{note_id}.json"
    central.write_text(json.dumps(note, indent=2) + "\n", encoding="utf-8")
    mirror = SKILLS_DIR / skill / "notes" / time.strftime("%Y-%m-%d") / f"{note_id}.md"
    if mirror.exists():
        with mirror.open("a", encoding="utf-8") as f:
            f.write(f"\n## Resolution\n\n- **Decision:** {decision}\n- **By:** {note['resolved_by']}\n- **Time:** {time.strftime('%Y-%m-%dT%H:%M:%S%z', time.localtime(now))}\n- **Note:** {note['resolution_note'] or '—'}\n")
    return note


def get_note(skill: str, note_id: str) -> dict:
    skill = _safe_skill(skill)
    note = next((n for n in _index(skill) if n.get("id") == note_id), None)
    if not note:
        raise ValueError("note not found")
    return note


def annotate_note(skill: str, note_id: str, fields: dict) -> dict:
    skill = _safe_skill(skill)
    notes = _index(skill)
    note = next((n for n in notes if n.get("id") == note_id), None)
    if not note:
        raise ValueError("note not found")
    allowed = {"fulfillment", "fulfill_error"}
    for key in allowed:
        if key in fields:
            note[key] = fields[key]
    _save_index(skill, notes)
    central = NOTES_DIR / skill / f"{note_id}.json"
    central.write_text(json.dumps(note, indent=2) + "\n", encoding="utf-8")
    mirror = SKILLS_DIR / skill / "notes" / time.strftime("%Y-%m-%d") / f"{note_id}.md"
    if mirror.exists() and fields.get("fulfillment"):
        with mirror.open("a", encoding="utf-8") as f:
            f.write(f"\n## Fulfillment\n\n- **Asset:** {fields['fulfillment'].get('asset_id', '')}\n- **Path:** `{fields['fulfillment'].get('path', '')}`\n")
    return note
