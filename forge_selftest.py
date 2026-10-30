"""LYGO Forge function self-test.

Run against a live Forge server. Proves API shape, persistence, worker policy,
gauntlet presence, Blender artifact and accepted jobs. Writes a JSON log.
"""
from __future__ import annotations

import json
import time
import urllib.request
from pathlib import Path

BASE = "http://127.0.0.1:8796"
ROOT = Path(r"<FORGE_DIR>")
LOG = ROOT / "data" / "gauntlet"


def get(path: str):
    req = urllib.request.Request(BASE + path, headers={"Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read().decode("utf-8", "replace"))


def run() -> dict:
    checks = []

    def check(name: str, ok: bool, detail):
        checks.append({"name": name, "ok": bool(ok), "detail": detail})

    status = get("/api/status")
    check("status", status.get("version") == "0.3.0" and status.get("brand") == "LYGO FORGE", status)

    projects = get("/api/projects").get("projects", [])
    check("projects", len(projects) >= 4, len(projects))

    state = get("/api/dispatcher/state")
    agents = {a["id"]: a for a in state.get("agents", [])}
    check("linked", state.get("linked") >= 5, state.get("linked"))
    check("standby", state.get("standby") >= 3, state.get("standby"))
    check("offline", state.get("offline") >= 1, state.get("offline"))
    check("master", agents.get("hermes-master", {}).get("model") == "nvidia/z-ai/glm-5.3-flash",
          agents.get("hermes-master", {}).get("model"))
    check("nvidia_primary", agents.get("nvidia-glm", {}).get("priority") == 1,
          agents.get("nvidia-glm", {}).get("priority"))
    check("local_ready", agents.get("local-qwen", {}).get("status") == "ready",
          agents.get("local-qwen", {}).get("status"))
    check("blender_ready", agents.get("blender-local", {}).get("status") == "ready",
          agents.get("blender-local", {}).get("status"))
    check("chatrtx_offline", agents.get("chatrtx-ui", {}).get("status") == "offline",
          agents.get("chatrtx-ui", {}).get("status"))

    skills = get("/api/dispatcher/skills").get("skills", [])
    check("skills", len(skills) >= 15, len(skills))

    latest = get("/api/gauntlet/latest")
    check("gauntlet_status", latest.get("status") == "done", latest.get("status"))
    check("gauntlet_agents", len(latest.get("agents", {})) >= 2, len(latest.get("agents", {})))

    jobs = state.get("jobs", [])
    accepted = [j for j in jobs if j.get("master") == "accepted"]
    check("accepted_jobs", len(accepted) >= 3, len(accepted))

    workflow = get("/api/workflow")
    check("workflow_stages", workflow.get("stage_count", 0) >= 10, workflow.get("stage_count"))
    check("workflow_roles", workflow.get("role_count", 0) >= 20, workflow.get("role_count"))

    sources = get("/api/assets/sources").get("sources", [])
    check("asset_sources", len(sources) >= 8, len(sources))
    check("asset_pointer_skill", (ROOT / "skills" / "forge-asset-pointer" / "SKILL.md").exists(), True)

    notes = get("/api/skills/forge-asset-pointer/notes").get("notes", [])
    check("skill_notes", len(notes) >= 1, len(notes))

    tools = {t["id"]: t for t in get("/api/tools").get("tools", [])}
    check("pdhowler_adapter", tools.get("pdhowler", {}).get("status") == "ready" and tools.get("pdhowler", {}).get("adapter") == "imagemagick-convert", tools.get("pdhowler"))
    check("rpgmaker_adapter", tools.get("rpgmaker-mv", {}).get("status") == "ready" and tools.get("rpgmaker-mv", {}).get("adapter") == "project-validator", tools.get("rpgmaker-mv"))
    check("rpgmaker_author", "rpgmaker.event.create" in tools.get("rpgmaker-mv", {}).get("capabilities", []), tools.get("rpgmaker-mv", {}).get("capabilities"))
    check("blocked_tools", tools.get("tyranobuilder", {}).get("testable") is False and tools.get("rytmik-studio", {}).get("testable") is False, "tyrano/rytmik blocked")

    glb = ROOT / "data" / "jobs" / "JOB-BAF53F5E-blender-smoke.glb"
    check("blender_glb", glb.exists() and glb.stat().st_size > 0, str(glb))

    result = {
        "ran": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "checks": checks,
        "passed": sum(1 for c in checks if c["ok"]),
        "total": len(checks),
        "ok": all(c["ok"] for c in checks),
    }
    LOG.mkdir(parents=True, exist_ok=True)
    (LOG / f"function-{time.strftime('%Y%m%d-%H%M%S')}.json").write_text(
        json.dumps(result, indent=2), encoding="utf-8")
    return result


if __name__ == "__main__":
    r = run()
    print(json.dumps(r, indent=2))
    raise SystemExit(0 if r["ok"] else 1)
