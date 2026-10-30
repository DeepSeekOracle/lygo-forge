"""LYGO Forge worker gauntlet.

Fixed, reproducible tests across local/API workers. Results are persisted so a
change can be compared with the previous run. The sandbox is disposable;
Lattice Arena is never the target of a mutating test.
"""
from __future__ import annotations

import json
import os
import shutil
import time
import uuid
from pathlib import Path

import harness_data as H
import orchestrator as O

ROOT = Path(__file__).resolve().parent
DATA = Path(os.environ.get("LYGO_FORGE_DATA", r"<FORGE_DIR>\data"))
GAUNTLET_DIR = DATA / "gauntlet"
SANDBOX = Path(r"<PROJECTS>\forge-gauntlet-sandbox")
TEMPLATE = ROOT / "template"
MAX_WAIT = 300


def ensure_sandbox() -> Path:
    GAUNTLET_DIR.mkdir(parents=True, exist_ok=True)
    if not SANDBOX.exists():
        SANDBOX.parent.mkdir(parents=True, exist_ok=True)
        shutil.copytree(TEMPLATE, SANDBOX)
        H.bootstrap(SANDBOX, "Forge Gauntlet Sandbox", "web-2d", overwrite=True)
    return SANDBOX


def wait_job(job_id: str, timeout: int = MAX_WAIT) -> dict:
    deadline = time.time() + timeout
    while time.time() < deadline:
        job = next((j for j in O.load_jobs() if j["id"] == job_id), None)
        if job and job.get("status") in ("returned", "failed", "done", "dispatched"):
            return job
        time.sleep(2)
    job = next((j for j in O.load_jobs() if j["id"] == job_id), None) or {"id": job_id, "status": "timeout"}
    job = dict(job)
    job["status"] = "timeout"
    job["error"] = f"gauntlet exceeded {timeout}s"
    return job


CASES = [
    {
        "id": "strict",
        "name": "Strict output token",
        "skill": "forge-gauntlet-strict",
        "brief": "Return exactly GAUNTLET_STRICT_OK and nothing else. No prose, no markdown, no explanation.",
        "evaluate": lambda result: 100 if result.strip() == "GAUNTLET_STRICT_OK" else (50 if "GAUNTLET_STRICT_OK" in result else 0),
    },
    {
        "id": "scope",
        "name": "Scope discipline JSON",
        "skill": "forge-gauntlet-scope",
        "brief": "Read-only. Do not edit any file. Return only valid JSON with keys status and files_changed: {\"status\":\"ok\",\"files_changed\":0}. No prose.",
        "evaluate": lambda result: _score_json(result),
    },
    {
        "id": "blender_plan",
        "name": "Blender Python plan",
        "skill": "forge-gauntlet-blender",
        "brief": "Return only a valid Blender Python snippet that creates a cube and exports a GLB. Use bpy.ops.mesh.primitive_cube_add() and bpy.ops.export_scene.gltf(). No prose, no markdown fences, no tool calls.",
        "evaluate": lambda result: _score_blender(result),
    },
]


def _score_json(result: str) -> int:
    text = result.strip()
    if text.startswith("```"):
        text = text.strip("`")
        text = text.split("\n", 1)[-1]
    try:
        data = json.loads(text)
        return 100 if data.get("status") == "ok" and data.get("files_changed") == 0 else 60
    except Exception:
        return 50 if '"files_changed"' in text and "0" in text else 0


def _score_blender(result: str) -> int:
    text = result
    has_cube = "bpy.ops.mesh.primitive_cube_add" in text
    has_export = "bpy.ops.export_scene.gltf" in text
    has_code = "import bpy" in text or "bpy." in text
    if has_cube and has_export:
        return 100
    if has_code and (has_cube or has_export):
        return 70
    return 0


def cleanup_stale() -> None:
    """A killed gauntlet must never leave a worker permanently busy."""
    jobs = O.load_jobs()
    changed = False
    for job in jobs:
        if job.get("status") == "working" and str(job.get("title", "")).startswith("Gauntlet "):
            job["status"] = "failed"
            job["error"] = "stale gauntlet job cleaned before a new run"
            job["finished"] = time.time()
            changed = True
    if changed:
        O.save_jobs(jobs)
    agents = O.load_agents()
    working = {j.get("agent") for j in jobs if j.get("status") == "working"}
    for agent in agents:
        if agent.get("current_job") and agent.get("id") not in working:
            agent["current_job"] = None
            if agent.get("status") == "busy":
                agent["status"] = "ready"
    O.save_agents(agents)


def run_gauntlet(agent_ids: list[str] | None = None) -> dict:
    cleanup_stale()
    sandbox = ensure_sandbox()
    agents = [a for a in O.refresh_agents() if a.get("dispatchable") and a.get("status") in ("ready", "standby") and a.get("kind") in ("local", "nvidia", "opencode")]
    if agent_ids:
        agents = [a for a in agents if a["id"] in agent_ids]
    run_id = time.strftime("%Y%m%d-%H%M%S") + "-" + uuid.uuid4().hex[:6]
    report = {
        "run": run_id,
        "started": time.time(),
        "sandbox": str(sandbox),
        "cases": [c["id"] for c in CASES],
        "agents": {},
        "summary": {},
        "status": "running",
    }
    GAUNTLET_DIR.mkdir(parents=True, exist_ok=True)
    path = GAUNTLET_DIR / f"{run_id}.json"
    path.write_text(json.dumps(report, indent=2), encoding="utf-8")

    for agent in agents:
        rec = {"id": agent["id"], "name": agent["name"], "model": agent.get("model"), "kind": agent.get("kind"),
               "cases": {}, "state": "ok"}
        report["agents"][agent["id"]] = rec
        for case in CASES:
            fresh = next((a for a in O.load_agents() if a["id"] == agent["id"]), None)
            if not fresh or fresh.get("status") == "busy":
                rec["cases"][case["id"]] = {"status": "skipped", "score": 0, "note": "agent busy"}
                continue
            # One job per case, explicitly assigned; no auto-selection.
            job = O.create_job(
                "forge-gauntlet-sandbox", str(sandbox),
                f"Gauntlet {case['id']} — {agent['name']}",
                case["brief"] + "\n\nThis is a read-only gauntlet. Do not modify the sandbox.",
                case.get("skill", "forge-qa-worker"), agent_id=agent["id"], auto=True,
            )
            done = wait_job(job["id"])
            result = done.get("result") or ""
            score = case["evaluate"](result) if done.get("status") == "returned" else 0
            rec["cases"][case["id"]] = {
                "job": job["id"], "status": done.get("status"), "score": score,
                "latency": done.get("elapsed"), "error": done.get("error", ""),
                "actual_agent": done.get("agent"), "fallback_used": done.get("fallback_used", ""),
                "result_preview": result[:600],
            }
            if done.get("status") == "returned":
                O.approve(job["id"], "accepted", f"gauntlet {case['id']} score={score}")
            if done.get("status") in ("timeout", "failed"):
                rec["state"] = "failed"
            path.write_text(json.dumps(report, indent=2), encoding="utf-8")
            time.sleep(1)

    all_scores = []
    for rec in report["agents"].values():
        scores = [c.get("score", 0) for c in rec["cases"].values() if c.get("status") == "returned"]
        rec["average"] = round(sum(scores) / len(scores), 1) if scores else 0
        rec["passed"] = sum(1 for s in scores if s >= 80)
        all_scores.extend(scores)
    report["summary"] = {
        "agents": len(report["agents"]),
        "completed": sum(1 for r in report["agents"].values() if r.get("state") == "ok"),
        "failed_slots": sum(1 for r in report["agents"].values() if r.get("state") == "failed"),
        "average": round(sum(all_scores) / len(all_scores), 1) if all_scores else 0,
        "max": max(all_scores) if all_scores else 0,
    }
    report["status"] = "done"
    report["finished"] = time.time()
    path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    (GAUNTLET_DIR / "latest.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    return report


def latest() -> dict:
    p = GAUNTLET_DIR / "latest.json"
    if not p.exists():
        return {"status": "not-run", "agents": {}, "summary": {}}
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except Exception:
        return {"status": "unreadable"}


if __name__ == "__main__":
    import sys
    ids = sys.argv[1:] or None
    report = run_gauntlet(ids)
    print(json.dumps(report.get("summary", {}), indent=2))
    for aid, rec in report.get("agents", {}).items():
        print(aid, "avg=", rec.get("average"), "state=", rec.get("state"))
