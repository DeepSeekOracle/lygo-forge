"""Hermes as the Forge Master behind the Build desk.

Discovers a local Hermes install and launches one oneshot turn inside the
project. The child is Hermes' own Python. This module never prints config.
"""
from __future__ import annotations

import json
import os
import re
import shutil
import subprocess
from pathlib import Path

MODEL = {
    "id": "hermes",
    "name": "Hermes",
    "route": "Hermes · Forge Master",
    "badge": "hermes",
}

RAILS = (
    "You are Hermes, the Forge Master inside LYGO Project Forge.\n"
    "The operator is talking through the Build desk. This directory is the project.\n"
    "Do the work they asked for. Use your tools. Stay inside this project.\n"
    "Do not publish, push, deploy, buy, or delete.\n"
    "Do not run git push, a release, a store upload, or any live publish.\n"
    "Do not print secrets, tokens, or credentials.\n"
    "Say what changed and the evidence you checked. An empty result is a failure.\n"
    "The human approves anything that leaves this machine.\n\n"
    "Operator message:\n"
)

_SESSION_ID = re.compile(r"[A-Za-z0-9_-]{6,128}")
_PYTHON_IN_CMD = re.compile(r'"([^"]+?python(?:\d+)?\.exe)"', re.IGNORECASE)


def engine_for_model(model: str) -> str:
    name = (model or "").strip().lower()
    if name == "hermes" or name.startswith("hermes/"):
        return "hermes"
    return "opencode"


def master_prompt(operator: str) -> str:
    return RAILS + (operator or "").strip()


def _cmd_candidates() -> list[Path]:
    found: list[Path] = []
    for key in ("HERMES_BIN", "LYGO_HERMES"):
        raw = os.environ.get(key, "").strip().strip('"')
        if raw:
            found.append(Path(raw))
    which = shutil.which("hermes")
    if which:
        found.append(Path(which))
    local = os.environ.get("LOCALAPPDATA", "").strip()
    if local:
        found.append(Path(local) / "hermes" / "bin" / "hermes.cmd")
    return found


def _python_from_launcher(cmd: Path) -> Path | None:
    if cmd.suffix.lower() == ".exe" and "python" in cmd.name.lower() and cmd.exists():
        return cmd
    if not cmd.exists() or cmd.suffix.lower() not in {".cmd", ".bat"}:
        return None
    try:
        text = cmd.read_text(encoding="utf-8", errors="replace")
    except OSError:
        return None
    match = _PYTHON_IN_CMD.search(text)
    if not match:
        return None
    python = Path(match.group(1))
    return python if python.exists() else None


def find_hermes() -> dict | None:
    """Return python, agent root, and Hermes home. None when Hermes is absent."""
    py_env = os.environ.get("HERMES_PYTHON", "").strip().strip('"')
    agent_env = os.environ.get("HERMES_AGENT", "").strip().strip('"')
    if py_env and agent_env:
        python = Path(py_env)
        agent = Path(agent_env)
        if python.exists() and agent.is_dir():
            home = os.environ.get("HERMES_HOME", "").strip() or str(agent.parent)
            return {"python": str(python), "agent": str(agent), "home": home, "cmd": ""}

    for cmd in _cmd_candidates():
        python = _python_from_launcher(cmd)
        if python is None:
            continue
        home = cmd.parent.parent if cmd.parent.name.lower() == "bin" else cmd.parent
        agent = home / "hermes-agent"
        if not agent.is_dir():
            continue
        return {"python": str(python), "agent": str(agent), "home": str(home), "cmd": str(cmd)}
    return None


def sessions_file(data_home: Path) -> Path:
    return Path(data_home) / "hermes-sessions.json"


def load_session(data_home: Path, project_key: str) -> str:
    path = sessions_file(data_home)
    if not path.exists():
        return ""
    try:
        data = json.loads(path.read_text(encoding="utf-8-sig"))
    except (OSError, json.JSONDecodeError):
        return ""
    rec = (data.get("by_project") or {}).get(project_key) or {}
    sid = str(rec.get("session_id") or "")
    return sid if _SESSION_ID.fullmatch(sid) else ""


def save_session(data_home: Path, project_key: str, session_id: str) -> None:
    if not project_key or not _SESSION_ID.fullmatch(session_id or ""):
        return
    path = sessions_file(data_home)
    data: dict = {"by_project": {}}
    if path.exists():
        try:
            loaded = json.loads(path.read_text(encoding="utf-8-sig"))
            if isinstance(loaded, dict) and isinstance(loaded.get("by_project"), dict):
                data = loaded
        except (OSError, json.JSONDecodeError):
            data = {"by_project": {}}
    data.setdefault("by_project", {})[project_key] = {"session_id": session_id}
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def session_id_from_usage(path: Path) -> str:
    if not path.exists():
        return ""
    try:
        data = json.loads(path.read_text(encoding="utf-8-sig"))
    except (OSError, json.JSONDecodeError):
        return ""
    sid = str(data.get("session_id") or "")
    return sid if _SESSION_ID.fullmatch(sid) else ""


def launch(install: dict, prompt: str, cwd: Path, usage_file: Path, resume: str, prompt_file: Path) -> subprocess.Popen:
    """Start one Hermes oneshot. stdout is the final reply. Approvals are Hermes' own oneshot policy."""
    prompt_file.parent.mkdir(parents=True, exist_ok=True)
    prompt_file.write_text(prompt, encoding="utf-8")
    usage_file.parent.mkdir(parents=True, exist_ok=True)
    env = os.environ.copy()
    env["FORGE_HERMES_AGENT"] = install["agent"]
    env["FORGE_HERMES_HOME"] = install["home"]
    env["HERMES_HOME"] = install["home"]
    env["FORGE_HERMES_PROMPT_FILE"] = str(prompt_file)
    env["FORGE_HERMES_USAGE"] = str(usage_file)
    env["FORGE_HERMES_CWD"] = str(cwd)
    env["FORGE_HERMES_RESUME"] = resume or ""
    brain = install.get("brain") or {}
    if brain.get("provider"):
        env["FORGE_LLM_PROVIDER"] = str(brain["provider"])
    if brain.get("model"):
        env["FORGE_LLM_MODEL"] = str(brain["model"])
    if brain.get("endpoint"):
        env["FORGE_LLM_BASE_URL"] = str(brain["endpoint"])
    if brain.get("api_key"):
        env["FORGE_LLM_API_KEY"] = str(brain["api_key"])
    env.pop("ELECTRON_RUN_AS_NODE", None)
    runner = Path(__file__).with_name("hermes_turn.py")
    return subprocess.Popen(
        [install["python"], "-I", str(runner)],
        cwd=str(cwd),
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        encoding="utf-8",
        errors="replace",
        bufsize=1,
    )
