#!/usr/bin/env python3
"""LYGO FORGE — a local, offline-first game studio shell.

No accounts, credits, telemetry, or Genex backend calls.
Runs OpenCode locally against free / NVIDIA-free / local Qwen models.
"""
from __future__ import annotations

# Every child process stays invisible: no console window over Justin's screen.
try:
    from win_quiet import install as _quiet_children
    _quiet_children()
except Exception:  # noqa: BLE001 - a missing guard must never stop the Forge
    pass

import gzip
import hashlib
import json
import os
import re
import shutil
import subprocess
import threading
import time
import urllib.request
import uuid
import webbrowser
from pathlib import Path

from flask import Flask, jsonify, request, send_from_directory, abort, make_response

import harness_data as H
import orchestrator as O
import gauntlet as G
import production_workflow as W
import notes as N
import assets as A
import context_builder as C
import tooling as T
import hermes_brain as B
import llm_setup as L

ROOT = Path(__file__).resolve().parent
WEB = ROOT / "web"
PISKEL_DIR = Path(os.environ.get("LYGO_PISKEL", r"<FORGE_DIR>\tools\piskel"))
TEMPLATE = ROOT / "template"
DATA_HOME = Path(os.environ.get("LYGO_FORGE_HOME", r"<FORGE_DIR>\data"))
REGISTRY = DATA_HOME / "projects.json"
JOBS_DIR = DATA_HOME / "jobs"
PROJECTS_ROOT = Path(os.environ.get("LYGO_FORGE_PROJECTS", r"<PROJECTS>"))
OPENCODE = Path(os.environ.get(
    "LYGO_OPENCODE",
    r"<USER>\AppData\Roaming\npm\node_modules\opencode-ai\bin\opencode.exe",
))
HOST = "127.0.0.1"
PORT = int(os.environ.get("LYGO_FORGE_PORT", "8796"))
# A real art/code pass can run for half an hour or more. 20 minutes used to cut agents off
# mid-work and the job looked "failed" when it was still working.
BUILD_TIMEOUT = int(os.environ.get("LYGO_FORGE_BUILD_TIMEOUT", "3600"))

MODELS = [
    B.MODEL,
    {"id": "opencode/deepseek-v4.1-flash-free", "name": "DeepSeek V4.1 Flash", "route": "OpenCode free", "badge": "free"},
    {"id": "opencode/glm-5.3-flash-free", "name": "GLM-5.3 Flash", "route": "OpenCode free", "badge": "free"},
    {"id": "opencode/beam-free", "name": "Beam", "route": "OpenCode free", "badge": "free"},
    {"id": "opencode/big-pickle", "name": "Big Pickle", "route": "OpenCode free", "badge": "free"},
    {"id": "nvidia/z-ai/glm-5.3-flash", "name": "NVIDIA GLM-5.3 Flash", "route": "NVIDIA free bridge", "badge": "nvidia"},
    {"id": "gemini/gemini-3-flash-preview", "name": "Gemini 3 Flash", "route": "Gemini CLI (official API)", "badge": "api"},
    {"id": "gemini/gemini-3.1-flash-lite", "name": "Gemini 3.1 Flash-Lite", "route": "Gemini CLI (official API)", "badge": "api"},
    {"id": "gemini/gemini-3.1-pro-preview", "name": "Gemini 3.1 Pro", "route": "Gemini CLI (quota-limited)", "badge": "api"},
    {"id": "nvidia/nvidia/nemotron-3-ultra-550b-a55b", "name": "NVIDIA Nemotron Ultra 550B", "route": "NVIDIA official API (8082)", "badge": "api"},
    {"id": "local/lygo-engine", "name": "LYGO Engine", "route": "Shared console engine", "badge": "local"},
]

app = Flask(__name__, static_folder=None)
_jobs: dict[str, dict] = {}
_CONSOLE_CACHE: dict = {}
_lock = threading.Lock()


def slugify(value: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return (s[:48] or "game")


def load_registry() -> dict:
    if REGISTRY.exists():
        try:
            data = json.loads(REGISTRY.read_text(encoding="utf-8-sig"))
            if isinstance(data, dict):
                return data
        except Exception:
            pass
    return {"projects": {}}


def save_registry(data: dict) -> None:
    REGISTRY.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def project_meta(path: Path) -> dict:
    name = path.name
    profile = "web-2d"
    mode = "2D"
    engine = ""
    harness = ""
    for file in ("forge.json", "studio.json"):
        p = path / file
        if p.exists():
            try:
                d = json.loads(p.read_text(encoding="utf-8"))
                name = d.get("name") or name
                profile = d.get("profile") or profile
                mode = d.get("mode") or mode
                engine = d.get("engine") or engine
                harness = d.get("harness") or harness
            except Exception:
                pass
    pdata = H.PROFILES.get(profile, H.PROFILES["web-2d"])
    return {
        "name": name,
        "slug": path.name,
        "path": str(path),
        "profile": profile,
        "profile_label": pdata["label"],
        "mode": mode,
        "engine": engine or pdata["engine"],
        "harness": harness,
        "has_index": (path / "index.html").exists(),
        "is_unity": ((path / "ProjectSettings" / "ProjectVersion.txt").exists()
                 or str(pdata.get("engine") or "").lower() == "unity"
                 or str(pdata.get("family") or "").lower() == "unity"
                 or path.name in _unity_map()),
        "has_tasks": (path / "TASKS.json").exists(),
        "has_build": (path / "BUILD.md").exists(),
    }


def all_projects() -> list[dict]:
    data = load_registry()
    out = []
    for slug, rec in data.get("projects", {}).items():
        p = Path(rec.get("path", ""))
        if p.exists():
            m = project_meta(p)
            m["slug"] = slug
            out.append(m)
    return sorted(out, key=lambda x: x["name"].lower())


def find_project(slug: str) -> Path | None:
    rec = load_registry().get("projects", {}).get(slug)
    if not rec:
        return None
    p = Path(rec.get("path", ""))
    return p if p.exists() else None


def add_project(path: Path, slug: str | None = None) -> dict:
    path = path.resolve()
    slug = slug or slugify(path.name)
    data = load_registry()
    base = slug
    n = 2
    while slug in data["projects"] and Path(data["projects"][slug]["path"]).resolve() != path:
        slug = f"{base}-{n}"
        n += 1
    data["projects"][slug] = {"path": str(path)}
    save_registry(data)
    return project_meta(path)


def append_log(job: dict, line: str) -> None:
    with _lock:
        job["log"].append(line)
        if len(job["log"]) > 8000:
            job["log"] = job["log"][-6000:]
    try:
        with job["logfile"].open("a", encoding="utf-8") as f:
            f.write(line + "\n")
    except Exception:
        pass


def _console_state() -> dict:
    """The Manager Console's own state, so the Forge reports the same numbers the launcher does."""
    global _CONSOLE_CACHE
    now = time.time()
    if _CONSOLE_CACHE.get("at") and now - _CONSOLE_CACHE["at"] < 10:
        return _CONSOLE_CACHE["data"]
    out = {"up": False}
    try:
        with urllib.request.urlopen("http://127.0.0.1:9641/api/health", timeout=8) as r:
            h = json.loads(r.read().decode("utf-8", "replace"))
        hw = h.get("hardware") or {}
        out = {
            "up": bool(h.get("ok")),
            "build": h.get("build"),
            "release_tag": h.get("release_tag"),
            "signature": h.get("signature"),
            "engine": h.get("brain"),
            "selected": h.get("selected"),
            "selected_source": h.get("selected_source"),
            "models": h.get("scan_n"),
            "ram_gb": round(float(h.get("ram_avail") or 0) / (1024 ** 3), 1),
            "hermes_api": ((h.get("hermes") or {}).get("model") or ""),
            "gpu_free_mib": (((hw.get("gpus") or [{}])[0] or {}).get("free_mib")),
            "limbs": len(h.get("tools") or []) if isinstance(h.get("tools"), list) else None,
        }
    except Exception as exc:
        out["error"] = f"{type(exc).__name__}: {exc}"
    _CONSOLE_CACHE = {"at": now, "data": out}
    return out


def _worker_wrote_paths(proj, since: float, paths) -> bool:
    """True if one of the task's declared files (or globs/dirs) changed since `since`."""
    import os as _os

    root = Path(proj)
    for rel in paths or []:
        rel = str(rel).replace("\\", "/").strip()
        if not rel:
            continue
        try:
            if any(ch in rel for ch in "*?["):
                for hit in root.glob(rel):
                    if hit.is_file() and hit.stat().st_mtime > since:
                        return True
                continue
            p = root / rel
            if p.is_dir():
                for dp, dirs, files in _os.walk(p):
                    dirs[:] = [d for d in dirs if d not in FORGE_MANAGED and not d.startswith(".")]
                    for f in files:
                        if _os.stat(_os.path.join(dp, f)).st_mtime > since:
                            return True
            elif p.is_file() and p.stat().st_mtime > since:
                return True
        except OSError:
            continue
    return False


def _apply_build_task_evidence(job: dict, project: Path, summary: str) -> None:
    """Close a board task only when the files THAT TASK NAMES were actually changed.

    A free build never closes anything. A task with no declared files falls back to any
    worker-owned file. A summary in a doc is not a build and must not pass this gate.
    """
    task_id = str(job.get("task") or "").strip()
    if not task_id:
        return
    started = float(job.get("started") or 0)
    try:
        tasks = H.ensure_task_chain(project)
        target = next((t for t in tasks if t.get("id") == task_id), None)
    except Exception as exc:
        append_log(job, f"[board] could not read board for {task_id}: {exc}")
        return
    if target and target.get("freeform"):
        append_log(job, "[board] free build: no board status change (instruction was the task)")
        return
    paths = (target or {}).get("files") or []
    wrote = _worker_wrote_paths(project, started - 3, paths) if paths else _worker_wrote(project, started - 3)
    if not wrote:
        wanted = ", ".join(str(p) for p in paths) or "any project file"
        append_log(job, f"[board] {task_id} kept pending (no change in {wanted})")
        return
    try:
        if target and target.get("status") != "done":
            ev = f"build {job.get('id')} ({job.get('model')}): {summary[:900]}"
            target.setdefault("evidence", []).append(ev)
            target["status"] = "done"
            H.save_tasks(project, tasks)
            append_log(job, f"[board] {task_id} marked done (files it names changed)")
    except Exception as exc:
        append_log(job, f"[board] could not update {task_id}: {exc}")


def _try_chat_dispatch(job: dict, project: Path, prompt: str) -> bool:
    """If the operator asks the Forge Master in chat to dispatch a task (e.g. 'dispatch TEC-02' or
    'dispatch next task'), dispatch it to the worker pool if a worker is free; return False if no
    dispatch was requested or if no worker is free (so the Master does the work itself)."""
    m = re.search(r"\bdispatch\s+(?:task\s+)?([A-Z]{2,4}-\d{2}|next)\b", prompt, re.I)
    if not m or len(prompt) > 260:
        return False
    token = m.group(1).upper()
    tasks = H.ensure_task_chain(project)
    task = _next_ready_task(project) if token == "NEXT" else next((t for t in tasks if t.get("id") == token), None)
    if not task:
        return False
    brief, skill, role, stage = _task_brief(project, task)
    djob = O.create_job(project.name, str(project), f"{task['id']} · {task['title']}",
                        brief, skill, agent_id="", auto=True, role=role, stage=stage,
                        context=C.build(project, task["id"]), gate="MASTER-DISPATCH",
                        task=task["id"])
    if djob.get("status") == "working":
        append_log(job, f"FORGE MASTER dispatched {task['id']} ({task['title']}) -> worker {djob.get('agent')} (job {djob.get('id')})")
        job["status"] = "done"
        job["finished"] = time.time()
        return True
    append_log(job, f"FORGE MASTER: worker dispatch for {task['id']} unavailable ({djob.get('dispatch_error') or djob.get('status')}); executing directly as Forge Master.")
    job["task"] = task["id"]
    return False


def _task_paths(project: Path, job: dict) -> list:
    """The files a job must touch to count: its task's `files`, `site/` for a free build."""
    tid = str(job.get("task") or "").strip()
    if tid:
        try:
            tasks = H.ensure_task_chain(project)
            t = next((x for x in tasks if x.get("id") == tid), None)
            if t and t.get("freeform"):
                return ["site"]
            if t and t.get("files"):
                return list(t["files"])
        except Exception:
            pass
    return ["site"]


def _finish_build(job: dict, project: Path) -> bool:
    """Mark done ONLY if the game files changed. A summary is not a build."""
    started = float(job.get("started") or 0)
    paths = _task_paths(project, job)
    if _worker_wrote_paths(project, started - 3, paths):
        job["status"] = "done"
        job["finished"] = time.time()
        return True
    job["status"] = "failed"
    job["finished"] = time.time()
    append_log(job, "NO BUILD: no change in " + ", ".join(str(p) for p in paths) +
               " — a plan, audit or summary run is rejected; the task stays open")
    return False


def run_build(job_id: str, project: Path, model: str, prompt: str, brain: dict | None = None) -> None:
    if B.engine_for_model(model) == "hermes":
        _run_hermes(job_id, project, prompt, brain or {})
        return
    if str(model).startswith(("gemini/", "nvidia/", "local/")):
        _run_api_master(job_id, project, model, prompt)
        return
    job = _jobs[job_id]
    env = os.environ.copy()
    env.pop("ELECTRON_RUN_AS_NODE", None)
    # Write long prompts to a brief file inside the project so OpenCode never hits Windows' 8191-char argv limit
    brief_dir = project / ".forge-briefs"
    brief_dir.mkdir(parents=True, exist_ok=True)
    brief_file = brief_dir / f"build-{job_id}.brief.md"
    brief_file.write_text(prompt, encoding="utf-8")
    short_msg = "Read the brief file attached to this run and execute it in the current working directory."
    cmd = [str(OPENCODE), "run", "--model", model, "-f", str(brief_file), "--", short_msg]
    job["status"] = "running"
    append_log(job, f"FORGE build {job_id}")
    append_log(job, f"project: {project}")
    append_log(job, f"model: {model}")
    append_log(job, f"budget: {BUILD_TIMEOUT}s ({BUILD_TIMEOUT // 60} min) before the watchdog stops the worker")
    try:
        proc = subprocess.Popen(
            cmd, cwd=str(project), env=env,
            stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
            text=True, encoding="utf-8", errors="replace", bufsize=1,
        )
        job["pid"] = proc.pid
        job["started"] = time.time()

        def watchdog():
            while job.get("status") == "running":
                if time.time() - job["started"] > BUILD_TIMEOUT:
                    job["status"] = "timeout"
                    append_log(job, f"FORGE timeout after {BUILD_TIMEOUT}s; stopping OpenCode")
                    subprocess.run(["taskkill", "/PID", str(proc.pid), "/T", "/F"],
                                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                    return
                time.sleep(3)

        threading.Thread(target=watchdog, daemon=True).start()
        assert proc.stdout
        for line in proc.stdout:
            append_log(job, line.rstrip("\n"))
        code = proc.wait()
        job["exit"] = code
        joined = "\n".join(job.get("log") or []).lower()
        quota_fail = ("usage limit" in joined or "429" in joined or "command line is too long" in joined)
        if job.get("status") in ("stopped", "timeout"):
            pass
        elif code == 0 and not quota_fail:
            if _finish_build(job, project):
                append_log(job, f"FORGE exit 0 — game files changed")
                _apply_build_task_evidence(job, project, "\n".join((job.get("log") or [])[-10:]))
        else:
            append_log(job, f"OpenCode exited {code} (or hit free quota); falling back to Forge Master API/Local chain...")
            _run_api_master(job_id, project, "nvidia/nvidia/nemotron-3-ultra-550b-a55b", prompt)
    except Exception as exc:
        append_log(job, f"OpenCode error ({type(exc).__name__}: {exc}); falling back to Forge Master API/Local chain...")
        _run_api_master(job_id, project, "nvidia/nvidia/nemotron-3-ultra-550b-a55b", prompt)


def _http_chat(base: str, model: str, prompt: str, timeout: int = 600) -> str:
    """One chat completion against a local OpenAI-shaped bridge (8081 engine / 8082 NVIDIA)."""
    return O._http_chat(base, model, prompt, timeout=timeout, max_tokens=4096)


def _gemini_chat(prompt: str, model: str, project: Path, timeout: int = 900) -> str:
    """One Gemini turn through the CLI. Writes long prompts to `.forge-briefs/` so `cmd /c` never
    overflows the Windows 8,191-char command-line limit."""
    key = O._gemini_key()
    if not key:
        raise RuntimeError("no Gemini API key (GEMINI_API_KEY or keys.gemini in api.json)")
    binp = Path(os.environ.get("LYGO_GEMINI", r"<USER>\AppData\Roaming\npm\gemini.cmd"))
    if not binp.exists():
        raise RuntimeError(f"gemini CLI not found at {binp}")
    env = os.environ.copy()
    env["GEMINI_API_KEY"] = key
    env.pop("ELECTRON_RUN_AS_NODE", None)
    arg_prompt = prompt
    if len(prompt) > 1400:
        brief_dir = project / ".forge-briefs"
        brief_dir.mkdir(parents=True, exist_ok=True)
        bf = brief_dir / f"gemini-chat-{int(time.time() * 1000)}.brief.md"
        bf.write_text(prompt, encoding="utf-8")
        rel = bf.relative_to(project)
        arg_prompt = f"Read `{rel}` in this workspace and execute the instructions in full."
    proc = subprocess.run(["cmd", "/c", str(binp), "-p", arg_prompt, "-m", model, "-y", "-o", "text"],
                          cwd=str(project), env=env, capture_output=True, text=True,
                          encoding="utf-8", errors="replace", timeout=timeout)
    out = "\n".join(line for line in (proc.stdout or "").splitlines()
                     if not line.startswith("Warning: 256-color")
                     and not line.startswith("Ripgrep is not available")
                     and "YOLO mode is enabled" not in line)
    if "quota" in (out + (proc.stderr or "")).lower() and "exceed" in (out + (proc.stderr or "")).lower():
        raise RuntimeError("Gemini quota exceeded for " + model)
    return out.strip()


def _run_api_master(job_id: str, project: Path, model: str, prompt: str) -> None:
    """Master chat & build execution through Free APIs first -> Local Engine (8081) fallback.
    Can dispatch board tasks when asked, write/edit project files via `_run_api_writer`, or answer
    operator questions in prose."""
    job = _jobs[job_id]
    provider, _, bare = model.partition("/")
    job["status"] = "running"
    job["started"] = job.get("started") or time.time()
    append_log(job, f"FORGE {provider} master {job_id}")
    append_log(job, f"project: {project}")
    append_log(job, f"model: {bare or model} (with Local Engine 8081 fallback)")
    append_log(job, f"budget: {BUILD_TIMEOUT}s")
    try:
        if _try_chat_dispatch(job, project, prompt):
            return
        wants_build = bool(job.get("task")) or any(
            w in prompt.lower() for w in (
                "create ", "write ", "update ", "edit ", "modify ", "fix ", "add ", "implement ",
                "build ", "wire ", "refactor ", "task ", "src/", "assets/", "docs/", ".js", ".json", ".html", ".md",
            )
        )
        text = ""
        if provider == "gemini" and not O.agent_cooling("gemini-flash"):
            try:
                text = _gemini_chat(prompt, bare, project, timeout=BUILD_TIMEOUT)
            except Exception as g_exc:
                append_log(job, f"[fallback] Gemini failed ({g_exc}); failing over to NVIDIA Free API -> Local Engine...")
                O.cool_down("gemini-flash", 15, str(g_exc))
                provider, bare = "nvidia", "nvidia/nemotron-3-ultra-550b-a55b"

        if not text:
            if wants_build:
                agent_cfg = {
                    "id": "nvidia-nemotron" if provider == "nvidia" else "local-qwen",
                    "kind": "nvidia" if provider == "nvidia" else "local",
                    "endpoint": "http://127.0.0.1:8082/v1" if provider == "nvidia" else "http://127.0.0.1:8081/v1",
                    "model": bare or ("nvidia/nemotron-3-ultra-550b-a55b" if provider == "nvidia" else "Qwen3-4B-Instruct-2507"),
                }
                wjob = {
                    "id": job_id,
                    "project": project.name,
                    "project_path": str(project),
                    "title": f"Master build ({job.get('task') or 'chat'})",
                    "brief": prompt,
                    "skill": "forge-worker",
                    "role": "forge-master",
                    "stage": "production",
                    "task": str(job.get("task") or ""),
                }
                try:
                    text = O._run_api_writer(agent_cfg, wjob)
                except Exception as w_exc:
                    append_log(job, f"[writer] No file patch applied ({w_exc}); answering in chat mode...")
            if not text:
                if provider == "nvidia" and not O.agent_cooling("nvidia-nemotron"):
                    try:
                        text = _http_chat("http://127.0.0.1:8082/v1",
                                          bare or "nvidia/nemotron-3-ultra-550b-a55b", prompt, timeout=BUILD_TIMEOUT)
                    except Exception as n_exc:
                        append_log(job, f"[fallback] NVIDIA 8082 failed ({n_exc}); falling back to Local Engine 8081...")
                        O.cool_down("nvidia-nemotron", 10, str(n_exc))
                if not text:
                    text = _http_chat("http://127.0.0.1:8081/v1",
                                      "Qwen3-4B-Instruct-2507", prompt, timeout=BUILD_TIMEOUT)
        if not text:
            raise RuntimeError("all providers returned an empty reply")
        append_log(job, text)
        if _finish_build(job, project):
            _apply_build_task_evidence(job, project, text)
            append_log(job, f"FORGE exit 0 ({round(job['finished'] - job['started'], 1)}s)")
    except Exception as exc:
        job["status"] = "failed"
        job["finished"] = time.time()
        append_log(job, f"ERROR {type(exc).__name__}: {exc}")


def _run_hermes(job_id: str, project: Path, prompt: str, brain: dict) -> None:
    job = _jobs[job_id]
    job["started"] = time.time()
    if _try_chat_dispatch(job, project, prompt):
        return
    install = B.find_hermes()
    if not install or not brain.get("ready"):
        append_log(job, "Hermes CLI unavailable or unconfigured; routing through Forge Master Free-API -> Local Engine chain.")
        _run_api_master(job_id, project, "nvidia/nvidia/nemotron-3-ultra-550b-a55b", prompt)
        return
    resume_key = f"{job.get('project')}|{brain.get('model')}|{brain.get('endpoint')}"
    resume = B.load_session(DATA_HOME, resume_key)
    usage = JOBS_DIR / f"{job_id}.usage.json"
    prompt_file = JOBS_DIR / f"{job_id}.prompt.md"
    wrapped = B.master_prompt(prompt)
    launch = dict(install)
    launch["brain"] = {
        "provider": brain.get("provider") or "custom",
        "model": brain.get("model") or "",
        "endpoint": brain.get("endpoint") or "",
        "api_key": brain.get("api_key") or ("local" if brain.get("mode") in ("local", "free-api") else ""),
    }
    job["status"] = "running"
    append_log(job, f"FORGE Hermes {job_id}")
    append_log(job, f"project: {project}")
    append_log(job, f"brain: {brain.get('label')} · {brain.get('model')} · {brain.get('tier')}")
    try:
        proc = B.launch(launch, wrapped, project, usage, resume, prompt_file)
        job["pid"] = proc.pid

        def watchdog():
            while job.get("status") == "running":
                if time.time() - job["started"] > BUILD_TIMEOUT:
                    job["status"] = "timeout"
                    append_log(job, f"FORGE timeout after {BUILD_TIMEOUT}s; stopping Hermes")
                    subprocess.run(["taskkill", "/PID", str(proc.pid), "/T", "/F"],
                                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                    return
                time.sleep(3)

        threading.Thread(target=watchdog, daemon=True).start()
        assert proc.stdout
        for line in proc.stdout:
            append_log(job, line.rstrip("\n"))
        code = proc.wait()
        session_id = B.session_id_from_usage(usage)
        if not session_id:
            for line in job["log"]:
                if "session_id:" in line:
                    session_id = line.split("session_id:", 1)[-1].strip()
                    if B._SESSION_ID.fullmatch(session_id):
                        break
                    session_id = ""
        if session_id:
            B.save_session(DATA_HOME, resume_key, session_id)
        job["exit"] = code
        joined_log = "\n".join(job.get("log") or []).lower()
        rate_limited = ("429" in joined_log or "rate limit" in joined_log or "quota" in joined_log)
        wrote_files = _worker_wrote(project, job["started"] - 3)
        if job.get("status") in ("stopped", "timeout"):
            return
        if code == 0 and not rate_limited and (wrote_files or not job.get("task")):
            _apply_build_task_evidence(job, project, "\n".join((job.get("log") or [])[-12:]))
            job["status"] = "done"
            job["finished"] = time.time()
            append_log(job, f"FORGE exit 0")
            return
        append_log(job, f"[fallback] Hermes primary brain exited {code} (rate_limited={rate_limited}, wrote_files={wrote_files}); failing over to Forge Master writer chain...")
        _run_api_master(job_id, project, "nvidia/nvidia/nemotron-3-ultra-550b-a55b", prompt)
    except Exception as exc:
        if job.get("status") not in ("stopped", "timeout"):
            append_log(job, f"FORGE Hermes error ({type(exc).__name__}: {exc}); failing over to Forge Master writer chain...")
            _run_api_master(job_id, project, "nvidia/nvidia/nemotron-3-ultra-550b-a55b", prompt)


@app.get("/")
def index():
    resp = make_response(send_from_directory(WEB, "index.html"))
    # The Forge UI is edited while the operator has it open. no-cache alone let a tab keep the old
    # shell (which is how a new button "does not exist"). no-store makes every load ask.
    resp.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    resp.headers["Pragma"] = "no-cache"
    return resp


@app.get("/web/<path:filename>")
def web_files(filename: str):
    return send_from_directory(WEB, filename)


@app.get("/pixel/")
@app.get("/pixel/<path:filename>")
def pixel_editor(filename: str = "index.html"):
    """Piskel (Apache-2.0) - the pixel-art editor, served from the gh-pages build.

    Vendor it, do not link to piskelapp.com: the editor must work offline and the same version must
    be what produced an asset. Exports (PNG / PNG sheet / .piskel JSON) download to the browser; drop
    them into <project>/assets/_inbox/ so the asset pointer can register source and licence.
    """
    if not PISKEL_DIR.is_dir():
        return jsonify({"error": "piskel not installed", "expected": str(PISKEL_DIR)}), 404
    resp = make_response(send_from_directory(PISKEL_DIR, filename))
    resp.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    return resp


@app.get("/api/status")
def api_status():
    return jsonify({
        "ok": True,
        "brand": "LYGO FORGE",
        "version": "0.3.0",
        "harness_version": "0.2",
        "profiles": list(H.PROFILES.keys()),
        "projects_root": str(PROJECTS_ROOT),
        "opencode": OPENCODE.exists(),
        "build_timeout": BUILD_TIMEOUT,
        "console": _console_state(),
        "agent_timeouts": {
            "gemini": os.environ.get("LYGO_GEMINI_TIMEOUT", "3600"),
            "local_or_nvidia": os.environ.get("LYGO_LLM_TIMEOUT", "3600"),
            "opencode": os.environ.get("LYGO_OPENCODE_TIMEOUT", "3600"),
            "foundry": os.environ.get("LYGO_FOUNDRY_TIMEOUT", "3600"),
        },
        "hermes": B.find_hermes() is not None,
        "brain": L.public_view(L.resolve(DATA_HOME)),
        "models": MODELS,
        "nvidia_bridge": O._http_models("http://127.0.0.1:8082/v1"),
        "local_bridge": O._http_models("http://127.0.0.1:8081/v1"),
        "store": False,
        "account": False,
    })


@app.get("/api/projects")
def api_projects():
    return jsonify({"projects": all_projects()})


@app.post("/api/projects")
def api_create_project():
    payload = request.get_json(silent=True) or {}
    name = str(payload.get("name") or "").strip()
    if not name:
        return jsonify({"error": "name required"}), 400
    PROJECTS_ROOT.mkdir(parents=True, exist_ok=True)
    slug = slugify(name)
    base = slug
    n = 2
    while (PROJECTS_ROOT / slug).exists():
        slug = f"{base}-{n}"
        n += 1
    profile = H.normalize_profile(str(payload.get("profile") or "web-2d"))
    dest = PROJECTS_ROOT / slug
    if H.PROFILES[profile]["family"] == "web":
        shutil.copytree(TEMPLATE, dest)
        idx = dest / "index.html"
        if idx.exists():
            html = idx.read_text(encoding="utf-8")
            html = re.sub(r"<title>.*?</title>", f"<title>{name} | LYGO Forge</title>", html, count=1, flags=re.S)
            idx.write_text(html, encoding="utf-8")
    else:
        dest.mkdir(parents=True)
        (dest / "README.md").write_text(
            f"# {name}\n\nUnity profile: {H.PROFILES[profile]['label']}\n\n"
            "This is a Forge planning workspace. Open it in Unity or copy the docs into an existing Unity project.\n",
            encoding="utf-8")
    H.bootstrap(dest, name, profile, overwrite=True)
    meta = add_project(dest, slug)
    return jsonify({"ok": True, "project": meta}), 201


@app.post("/api/adopt")
def api_adopt():
    payload = request.get_json(silent=True) or {}
    raw = str(payload.get("path") or "").strip().strip('"')
    if not raw:
        return jsonify({"error": "path required"}), 400
    p = Path(raw)
    if not p.exists() or not p.is_dir():
        return jsonify({"error": "folder not found"}), 404
    profile = str(payload.get("profile") or "")
    if profile:
        H.bootstrap(p, p.name, profile, overwrite=False)
    meta = add_project(p)
    return jsonify({"ok": True, "project": meta})


@app.post("/api/projects/<slug>/harness")
def api_init_harness(slug: str):
    project = find_project(slug)
    if not project:
        return jsonify({"error": "project not found"}), 404
    payload = request.get_json(silent=True) or {}
    profile = H.normalize_profile(str(payload.get("profile") or project_meta(project).get("profile") or "web-2d"))
    result = H.bootstrap(project, project_meta(project)["name"], profile, overwrite=False)
    return jsonify(result)


@app.get("/api/harness")
def api_harness():
    return jsonify(H.harness_payload())


@app.get("/api/projects/<slug>/tasks")
def api_tasks(slug: str):
    project = find_project(slug)
    if not project:
        return jsonify({"error": "project not found"}), 404
    tasks = H.ensure_task_chain(project)
    meta = project_meta(project)
    nxt = H.next_task(tasks)
    return jsonify({"profile": meta.get("profile"), "tasks": tasks, "next": nxt})


@app.post("/api/projects/<slug>/tasks/<task_id>")
def api_task_update(slug: str, task_id: str):
    project = find_project(slug)
    if not project:
        return jsonify({"error": "project not found"}), 404
    payload = request.get_json(silent=True) or {}
    tasks = H.ensure_task_chain(project)
    task = next((t for t in tasks if t["id"] == task_id), None)
    if not task:
        return jsonify({"error": "task not found"}), 404
    if payload.get("status") in ("pending", "active", "done", "blocked"):
        if payload["status"] == "done":
            done = {t["id"] for t in tasks if t.get("status") == "done"}
            missing = [d for d in task.get("depends_on", []) if d not in done]
            if missing:
                return jsonify({"error": "dependencies incomplete: " + ", ".join(missing)}), 409
        task["status"] = payload["status"]
    if payload.get("evidence"):
        task.setdefault("evidence", []).append(str(payload["evidence"]))
    H.save_tasks(project, tasks)
    return jsonify({"ok": True, "task": task})


@app.post("/api/build")
def api_build():
    payload = request.get_json(silent=True) or {}
    slug = str(payload.get("project") or "")
    project = find_project(slug)
    if not project:
        return jsonify({"error": "project not found"}), 404
    prompt = str(payload.get("prompt") or "").strip()
    model = str(payload.get("model") or MODELS[0]["id"])
    meta = project_meta(project)
    task_id = str(payload.get("task") or "")
    specialist = str(payload.get("specialist") or "")
    task = None
    if task_id:
        tasks = H.ensure_task_chain(project)
        task = next((t for t in tasks if t["id"] == task_id), None)
        if not task:
            return jsonify({"error": f"task not found: {task_id}"}), 404
        if not specialist:
            specialist = task.get("owner") or "producer"
        if task.get("freeform"):
            # permanent free-build slot: the operator's instruction is the whole task,
            # and no phase gate applies (it is not part of the phased board)
            if not prompt:
                return jsonify({"error": "this is the free-build task: send an instruction in `prompt`"}), 400
            prompt = H.task_prompt(project, task, specialist, meta.get("profile", "web-2d"), prompt)
        else:
            # An explicit dispatch is operator intent: no phase gate. Dependencies still
            # order the automatic "next" pick, which is where they belong.
            prompt = H.task_prompt(project, task, specialist, meta.get("profile", "web-2d"), prompt)
    if not prompt:
        return jsonify({"error": "prompt or task required"}), 400
    brain = None
    if B.engine_for_model(model) == "hermes":
        if B.find_hermes() is None:
            return jsonify({"error": "Hermes is not installed. Install Hermes and put it on PATH, or set HERMES_BIN."}), 500
        brain = L.resolve(DATA_HOME)
        if brain.get("mode") == "api":
            brain = dict(brain)
            brain["api_key"] = L.read_key(DATA_HOME)
        if not brain.get("ready"):
            return jsonify({"error": brain.get("hint") or "No model is ready."}), 409
        if any(item.get("status") in ("queued", "running") and B.engine_for_model(item.get("model", "")) == "hermes"
               for item in _jobs.values()):
            return jsonify({"error": "Hermes is already on a Forge turn. Wait for it to finish."}), 409
    elif not OPENCODE.exists():
        return jsonify({"error": f"OpenCode not found at {OPENCODE}"}), 500
    job_id = uuid.uuid4().hex[:12]
    logfile = JOBS_DIR / f"{job_id}.log"
    job = {"id": job_id, "status": "queued", "log": [], "logfile": logfile,
           "project": slug, "model": model, "task": task_id, "specialist": specialist,
           "started": time.time(), "pid": None}
    _jobs[job_id] = job
    threading.Thread(target=run_build, args=(job_id, project, model, prompt, brain), daemon=True).start()
    return jsonify({"ok": True, "job": job_id}), 202


@app.get("/api/llm")
def api_llm():
    return jsonify(L.public_view(L.resolve(DATA_HOME)))


@app.post("/api/llm")
def api_llm_save():
    try:
        brain = L.apply_choice(DATA_HOME, request.get_json(silent=True) or {})
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    return jsonify(brain)


@app.post("/api/llm/scan")
def api_llm_scan():
    return jsonify({
        "found": L.probe_local(),
        "brain": L.public_view(L.resolve(DATA_HOME)),
    })


@app.get("/api/jobs/<job_id>")
def api_job(job_id: str):
    job = _jobs.get(job_id)
    if not job:
        # allow status after a process restart by reading the log
        f = JOBS_DIR / f"{job_id}.log"
        if not f.exists():
            return jsonify({"error": "job not found"}), 404
        return jsonify({"id": job_id, "status": "unknown", "log": f.read_text(encoding="utf-8", errors="replace").splitlines()})
    return jsonify({"id": job_id, "status": job["status"], "exit": job.get("exit"),
                    "project": job["project"], "model": job["model"],
                    "task": job.get("task"), "specialist": job.get("specialist"),
                    "log": job["log"]})


@app.post("/api/jobs/<job_id>/stop")
def api_stop_job(job_id: str):
    job = _jobs.get(job_id)
    if not job:
        return jsonify({"error": "job not found"}), 404
    pid = job.get("pid")
    if pid and job["status"] == "running":
        subprocess.run(["taskkill", "/PID", str(pid), "/T", "/F"],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        job["status"] = "stopped"
        append_log(job, "FORGE stopped by operator")
    return jsonify({"ok": True, "status": job["status"]})


@app.get("/preview/<slug>/", defaults={"filename": "index.html"})
@app.get("/preview/<slug>/<path:filename>")
def preview(slug: str, filename: str):
    project = find_project(slug)
    if not project:
        abort(404)
    # Prefer a site/ subfolder when the project has one: game copy in site/, docs and harness
    # alongside it. Older projects keep the game at the root and still resolve.
    site = project / "site"
    base = site if (site / "index.html").is_file() else project
    target = (base / filename).resolve()
    if not str(target).startswith(str(project.resolve())):
        abort(403)
    if not target.exists():
        abort(404)
    if target.is_dir():
        target = target / "index.html"
    resp = make_response(send_from_directory(target.parent, target.name))
    # A game is edited between reloads. `no-cache` alone let Chrome reuse ES modules from memory, so
    # the HTML refreshed while src/*.js stayed old - the operator saw "nothing changed" after a real
    # build. no-store forces every module back through the server.
    resp.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    resp.headers["Pragma"] = "no-cache"
    return resp


# ------------------------------------------------------------------ git bridge
# Pull / Sync / Push / Post live, per project. The project knows where its game lives, so neither a
# human nor an agent types git commands or remembers paths. Everything is scoped to the ONE game
# folder; a dirty tree outside it is a hard stop.
GAMES_REG = DATA_HOME / "games.json"
GAMES_REPO = Path(os.environ.get("LYGO_GAMES_REPO", r"D:\excavationpro-ca"))
GAMES_LIVE = "https://excavationpro.ca/games/"


def _game_meta(slug: str):
    return GAMES_REPO, f"games/{slug}", f"{GAMES_LIVE}{slug}/"


def _git(repo: Path, *args, timeout: int = 240):
    try:
        r = subprocess.run(["git", "-C", str(repo), *args], capture_output=True,
                           text=True, timeout=timeout)
        return r.returncode, ((r.stdout or "") + (r.stderr or "")).strip()
    except Exception as exc:
        return 1, f"git failed: {exc}"


def _file_map(root: Path) -> dict:
    out = {}
    if not root.exists():
        return out
    for dp, dirs, files in os.walk(root):
        dirs[:] = [d for d in dirs if d != ".git"]
        for f in files:
            p = Path(dp) / f
            try:
                out[str(p.relative_to(root)).replace("\\", "/")] = hashlib.sha256(
                    p.read_bytes().replace(b"\r\n", b"\n")).hexdigest()
            except OSError:
                pass
    return out


def _site_vs_repo(site: Path, repodir: Path) -> dict:
    a, b = _file_map(site), _file_map(repodir)
    only_site = sorted(set(a) - set(b))
    only_repo = sorted(set(b) - set(a))
    changed = sorted(k for k in set(a) & set(b) if a[k] != b[k])
    return {"only_site": only_site[:25], "only_repo": only_repo[:25], "changed": changed[:25],
            "counts": {"site": len(a), "repo": len(b), "only_site": len(only_site),
                       "only_repo": len(only_repo), "changed": len(changed)}}


def _copy_tree(src: Path, dst: Path) -> int:
    n = 0
    for dp, dirs, files in os.walk(src):
        dirs[:] = [d for d in dirs if d != ".git"]
        rel = Path(dp).relative_to(src)
        (dst / rel).mkdir(parents=True, exist_ok=True)
        for f in files:
            shutil.copy2(Path(dp) / f, dst / rel / f)
            n += 1
    return n


def _dirty_split(repo: Path, rel: str):
    _, out = _git(repo, "status", "--porcelain")
    rows = [ln for ln in out.splitlines() if ln.strip()]
    _rel = str(rel).replace("\\", "/").strip("./")
    inside = [ln for ln in rows if ln[3:].replace("\\", "/").startswith(_rel)]
    outside = [ln for ln in rows if ln not in inside]
    return inside, outside


def _git_ctx(slug: str, target: str = "site"):
    """target="site" -> the web repo slice that feeds the preview (default).
       target="unity" -> the Unity source project's own repo, when it has one."""
    project = find_project(slug)
    repo, rel, live = _game_meta(slug)
    if str(target).lower() == "unity":
        ent = _unity_entry(slug)
        urepo = Path(str(ent.get("repo") or ent.get("path") or ""))
        if str(ent.get("repo") or "") and (urepo / ".git").exists():
            return project, urepo, Path("."), "unity", True
        return project, urepo, Path("."), "unity", False
    is_repo = (repo / ".git").exists()
    return project, repo, rel, live, is_repo


@app.get("/api/projects/<slug>/build")
def api_project_build(slug: str):
    """The build contract. Agents read BUILD.md from disk; this shows the operator the same file."""
    project = find_project(slug)
    if not project:
        return jsonify({"error": "project not found"}), 404
    f = project / "BUILD.md"
    if not f.is_file():
        return jsonify({"exists": False, "slug": slug,
                        "hint": "no BUILD.md - this project has no build contract yet"})
    return jsonify({"exists": True, "slug": slug, "path": str(f),
                    "text": f.read_text(encoding="utf-8", errors="replace")})


@app.get("/api/projects/<slug>/preview-info")
def api_preview_info(slug: str):
    """What the preview is serving right now: path, mtime, sha256, and files changed AFTER that.
    This is how an operator tells "nothing was built" from "the frame is stale"."""
    project = find_project(slug)
    if not project:
        return jsonify({"error": "project not found"}), 404
    site = project / "site"
    base = site if (site / "index.html").is_file() else project
    served = base / "index.html"
    if not served.is_file():
        return jsonify({"error": "no index.html to preview"}), 400
    rel = str(served.relative_to(project)).replace("\\", "/")
    raw = served.read_bytes()
    digest = hashlib.sha256(raw.replace(b"\r\n", b"\n")).hexdigest()
    mtime = served.stat().st_mtime
    newer = []
    try:
        for f in project.rglob("*"):
            if not f.is_file():
                continue
            if any(x in f.parts for x in ("node_modules", ".git")) or f.name == "index.html":
                continue
            st = f.stat()
            if st.st_mtime > mtime + 1:
                newer.append({"file": str(f.relative_to(project)).replace("\\", "/"),
                              "at": time.strftime("%H:%M:%S", time.localtime(st.st_mtime)),
                              "kb": round(st.st_size / 1024, 1)})
    except Exception:
        pass
    newer.sort(key=lambda r: r["at"], reverse=True)
    return jsonify({"slug": slug, "served_file": rel, "served_path": str(served),
                    "sha256": digest, "size": len(raw),
                    "mtime": time.strftime("%Y-%m-%dT%H:%M:%S", time.localtime(mtime)),
                    "age_seconds": int(time.time() - mtime),
                    "changed_after_served": newer[:12], "changed_count": len(newer)})


@app.get("/api/projects/<slug>/git")
def api_git_status(slug: str):
    target = str(request.args.get("target") or "site")
    try:
        project, repo, rel, live, is_repo = _git_ctx(slug, target)
    except Exception as exc:  # noqa: BLE001
        return jsonify({"error": f"git context failed: {type(exc).__name__}: {exc}"}), 400
    if not project:
        return jsonify({"error": "project not found"}), 404
    if not is_repo:
        return jsonify({"error": f"no git repo at {repo}"}), 400
    _git(repo, "fetch", "origin")
    _, head = _git(repo, "rev-parse", "--short", "HEAD")
    _, ab = _git(repo, "rev-list", "--left-right", "--count", "origin/main...HEAD")
    inside, outside = _dirty_split(repo, rel)
    if live == "unity":
        # No site/ mirror to compare against: the Unity project IS the source.
        diff = {"only_site": [], "only_repo": [], "changed": [],
                "counts": {"site": 0, "repo": 0, "only_site": 0, "only_repo": 0, "changed": 0},
                "note": "unity source repo - git acts on the project itself"}
    else:
        diff = _site_vs_repo(project / "site", repo / rel)
    parts = ab.split()
    return jsonify({"slug": slug, "repo": str(repo), "path": str(rel), "live": live,
                    "target": target,
                    "head": head.strip(),
                    "behind": int(parts[0]) if len(parts) == 2 else 0,
                    "ahead": int(parts[1]) if len(parts) == 2 else 0,
                    "dirty_game": inside[:20], "dirty_outside": outside[:20],
                    "site_diff": diff})


@app.post("/api/projects/<slug>/git/pull")
def api_git_pull(slug: str):
    """origin -> repo -> site. Refuses to clobber uncommitted site work unless force=true."""
    payload = request.get_json(silent=True) or {}
    _target = str(request.args.get("target") or (request.get_json(silent=True) or {}).get("target") or "site")
    project, repo, rel, live, is_repo = _git_ctx(slug, _target)
    if str(_target).lower() == "unity":
        return jsonify({
            "error": "refused: the site mirror does not apply to the Unity source repo",
            "why": ("Pull/Sync copy repo -> site/. Pointed at the Unity project that would copy the "
                    "entire project (Assets, ProjectSettings, Library) into the Forge site folder. "
                    "Use the Unity editor's own version control, or switch the target back to SITE."),
            "target": "unity",
            "repo": str(repo),
        }), 400
    if not project:
        return jsonify({"error": "project not found"}), 404
    if not is_repo:
        return jsonify({"error": f"no git repo at {repo}"}), 400
    site, repodir = project / "site", repo / rel
    diff = _site_vs_repo(site, repodir)
    dirty_site = diff["counts"]["only_site"] + diff["counts"]["changed"]
    if dirty_site and not payload.get("force"):
        return jsonify({"error": "site differs from the repo; pass force=true to overwrite it",
                        "site_diff": diff}), 409
    log = []
    _, out = _git(repo, "fetch", "origin")
    log.append("fetch: " + (out.splitlines()[-1] if out else "ok"))
    _, ab = _git(repo, "rev-list", "--left-right", "--count", "origin/main...HEAD")
    parts = ab.split()
    behind = int(parts[0]) if len(parts) == 2 else 0
    ahead = int(parts[1]) if len(parts) == 2 else 0
    if behind and ahead:
        code, out = _git(repo, "rebase", "origin/main")
        log.append("diverged -> rebase: " + (out.splitlines()[-1] if out else "ok"))
        if code:
            _git(repo, "rebase", "--abort")
            return jsonify({"error": "repo diverged and the rebase failed", "log": log}), 409
    elif behind:
        _, out = _git(repo, "merge", "--ff-only", "origin/main")
        log.append("fast-forward: " + (out.splitlines()[-1] if out else "ok"))
    else:
        log.append("nothing to pull; repo is level or ahead")
    copied = _copy_tree(repodir, site)
    _, head = _git(repo, "rev-parse", "--short", "HEAD")
    return jsonify({"ok": True, "copied": copied, "head": head.strip(), "log": log})


@app.post("/api/projects/<slug>/git/sync")
def api_git_sync(slug: str):
    """site -> repo working tree. Stages the game folder, never commits."""
    _target = str(request.args.get("target") or (request.get_json(silent=True) or {}).get("target") or "site")
    project, repo, rel, live, is_repo = _git_ctx(slug, _target)
    if str(_target).lower() == "unity":
        return jsonify({
            "error": "refused: the site mirror does not apply to the Unity source repo",
            "why": ("Pull/Sync copy repo -> site/. Pointed at the Unity project that would copy the "
                    "entire project (Assets, ProjectSettings, Library) into the Forge site folder. "
                    "Use the Unity editor's own version control, or switch the target back to SITE."),
            "target": "unity",
            "repo": str(repo),
        }), 400
    if not project:
        return jsonify({"error": "project not found"}), 404
    if not is_repo:
        return jsonify({"error": f"no git repo at {repo}"}), 400
    site, repodir = project / "site", repo / rel
    if not site.is_dir():
        return jsonify({"error": "project has no site/ to sync"}), 400
    copied = _copy_tree(site, repodir)
    _git(repo, "add", "--", rel)
    _, stat = _git(repo, "diff", "--cached", "--stat", "--", rel)
    inside, outside = _dirty_split(repo, rel)
    return jsonify({"ok": True, "copied": copied, "staged_stat": stat,
                    "dirty_game": inside[:20], "dirty_outside": outside[:20]})


@app.post("/api/projects/<slug>/git/push")
def api_git_push(slug: str):
    """Commit the staged game folder and push. Refuses if anything unrelated is dirty."""
    payload = request.get_json(silent=True) or {}
    _target = str(request.args.get("target") or (request.get_json(silent=True) or {}).get("target") or "site")
    project, repo, rel, live, is_repo = _git_ctx(slug, _target)
    if str(_target).lower() == "unity":
        return jsonify({
            "error": "refused: the site mirror does not apply to the Unity source repo",
            "why": ("Pull/Sync copy repo -> site/. Pointed at the Unity project that would copy the "
                    "entire project (Assets, ProjectSettings, Library) into the Forge site folder. "
                    "Use the Unity editor's own version control, or switch the target back to SITE."),
            "target": "unity",
            "repo": str(repo),
        }), 400
    if not project:
        return jsonify({"error": "project not found"}), 404
    if not is_repo:
        return jsonify({"error": f"no git repo at {repo}"}), 400
    inside, outside = _dirty_split(repo, rel)
    if outside:
        return jsonify({"error": "repo has changes outside this game; refusing to commit",
                        "dirty_outside": outside[:20]}), 409
    if not inside:
        return jsonify({"ok": True, "pushed": False, "log": ["nothing staged for this game"]})
    msg = str(payload.get("message") or f"{slug}: sync from Forge project")[:200]
    _git(repo, "add", "--", rel)
    code, out = _git(repo, "-c", "user.name=DeepSeekOracle",
                     "-c", "user.email=DeepSeekOracle@users.noreply.github.com",
                     "commit", "-m", msg, "--", rel)
    if code:
        return jsonify({"error": "commit failed", "log": out.splitlines()[-5:]}), 409
    code, out = _git(repo, "push", "origin", "HEAD:refs/heads/main")
    if code:
        return jsonify({"error": "push rejected", "log": out.splitlines()[-6:]}), 409
    _, head = _git(repo, "rev-parse", "--short", "HEAD")
    return jsonify({"ok": True, "pushed": True, "head": head.strip(),
                    "log": (out.splitlines() or [])[-2:]})


@app.post("/api/projects/<slug>/git/post")
def api_git_post(slug: str):
    """Ship it: sync, commit, push, then wait until the live page actually serves it."""
    payload = request.get_json(silent=True) or {}
    if not payload.get("confirm"):
        return jsonify({"error": "posting live needs confirm=true"}), 400
    _target = str(request.args.get("target") or (request.get_json(silent=True) or {}).get("target") or "site")
    project, repo, rel, live, is_repo = _git_ctx(slug, _target)
    if str(_target).lower() == "unity":
        return jsonify({
            "error": "refused: the site mirror does not apply to the Unity source repo",
            "why": ("Pull/Sync copy repo -> site/. Pointed at the Unity project that would copy the "
                    "entire project (Assets, ProjectSettings, Library) into the Forge site folder. "
                    "Use the Unity editor's own version control, or switch the target back to SITE."),
            "target": "unity",
            "repo": str(repo),
        }), 400
    if not project:
        return jsonify({"error": "project not found"}), 404
    if not is_repo:
        return jsonify({"error": f"no git repo at {repo}"}), 400
    site, repodir = project / "site", repo / rel
    local = _file_map(site).get("index.html", "")
    _copy_tree(site, repodir)
    _git(repo, "add", "--", rel)
    inside, outside = _dirty_split(repo, rel)
    if outside:
        return jsonify({"error": "repo has unrelated changes; refusing to ship",
                        "dirty_outside": outside[:20]}), 409
    pushed = False
    if inside:
        msg = str(payload.get("message") or f"{slug}: post live from Forge")[:200]
        code, out = _git(repo, "-c", "user.name=DeepSeekOracle",
                         "-c", "user.email=DeepSeekOracle@users.noreply.github.com",
                         "commit", "-m", msg, "--", rel)
        if code:
            return jsonify({"error": "commit failed", "log": out.splitlines()[-5:]}), 409
        code, out = _git(repo, "push", "origin", "HEAD:refs/heads/main")
        if code:
            return jsonify({"error": "push rejected", "log": out.splitlines()[-6:]}), 409
        pushed = True
    _, head = _git(repo, "rev-parse", "--short", "HEAD")
    verified, seen, waited = False, "", 0
    for waited in range(0, 181, 15):
        try:
            req = urllib.request.Request(live, headers={"User-Agent": "LYGO-Forge/1.0"})
            with urllib.request.urlopen(req, timeout=20) as r:
                body = r.read()
                if (r.headers.get("Content-Encoding") or "").lower() == "gzip":
                    body = gzip.decompress(body)
            seen = hashlib.sha256(body.replace(b"\r\n", b"\n")).hexdigest()
            if seen == local:
                verified = True
                break
        except Exception:
            pass
        time.sleep(15)
    return jsonify({"ok": True, "pushed": pushed, "head": head.strip(), "live": live,
                    "verified": verified, "waited_s": waited,
                    "live_sha": seen[:16], "local_sha": local[:16]})


# ------------------------------------------------------------------ unity boot
# A Unity game's preview is a WebGL build; the *source* is a Unity project. This boots the real
# editor with that project so an agent or a human can work on it.
UNITY_JSON = DATA_HOME / "unity.json"
UNITY_EDITOR_ROOT = Path(os.environ.get("LYGO_UNITY_EDITORS", r"C:\Program Files\Unity\Hub\Editor"))


def _unity_map() -> dict:
    if UNITY_JSON.exists():
        try:
            return json.loads(UNITY_JSON.read_text(encoding="utf-8"))
        except Exception:
            return {}
    return {}


def _unity_editors() -> list[str]:
    if not UNITY_EDITOR_ROOT.is_dir():
        return []
    return sorted((p.name for p in UNITY_EDITOR_ROOT.iterdir() if p.is_dir()), reverse=True)


def _unity_entry(slug: str) -> dict:
    """Normalise a unity.json value: either a bare path or {path, scene, repo}."""
    raw = _unity_map().get(slug)
    if not raw:
        return {}
    if isinstance(raw, str):
        return {"path": raw}
    if isinstance(raw, dict):
        return raw
    return {}


def _unity_version(project: Path) -> str:
    f = project / "ProjectSettings" / "ProjectVersion.txt"
    if not f.exists():
        return ""
    for line in f.read_text(encoding="utf-8", errors="replace").splitlines():
        if "m_EditorVersion:" in line:
            return line.split(":", 1)[1].strip()
    return ""


@app.get("/api/unity")
def api_unity():
    return jsonify({"projects": _unity_map(), "editors": _unity_editors(),
                    "root": str(UNITY_EDITOR_ROOT)})


@app.post("/api/projects/<slug>/unity/boot")
def api_unity_boot(slug: str):
    payload = request.get_json(silent=True) or {}
    project = find_project(slug)
    if not project:
        return jsonify({"error": "project not found"}), 404
    ent = _unity_entry(slug)
    path = str(payload.get("path") or ent.get("path") or "").strip()
    scene = str(payload.get("scene") or ent.get("scene") or "").strip()
    if not path or not Path(path).is_dir():
        return jsonify({"error": f"no Unity project mapped for '{slug}'. "
                                 f"Add it to {UNITY_JSON} as {{\"{slug}\": \"<project path>\"}}."}), 400
    p = Path(path)
    version = _unity_version(p)
    if not version:
        return jsonify({"error": f"not a Unity project (no ProjectSettings/ProjectVersion.txt): {p}"}), 400
    exe = UNITY_EDITOR_ROOT / version / "Editor" / "Unity.exe"
    if not exe.exists():
        installed = _unity_editors()
        return jsonify({"error": f"Unity {version} not installed under {UNITY_EDITOR_ROOT}",
                        "installed": installed}), 400
    # Unity opens whatever scene is in Library/LastSceneManagerSetup.txt. Without a valid entry a
    # fresh open lands on an empty untitled scene - which is what "it did not load fully" looks like.
    scene_note, last = "", p / "Library" / "LastSceneManagerSetup.txt"
    if scene:
        scene_file = p / scene.replace("/", os.sep)
        if not scene_file.exists():
            return jsonify({"error": f"scene not found in project: {scene}"}), 400
        if (p / "Library").is_dir():
            try:
                if last.exists():
                    last.with_suffix(".txt.forgebak").write_bytes(last.read_bytes())
                last.write_text(
                    "sceneSetups:\n- path: %s\n  isLoaded: 1\n  isActive: 1\n"
                    "  isSubScene: 0\n" % scene.replace("\\", "/"), encoding="utf-8")
                scene_note = f"opens scene {scene}"
            except Exception as exc:  # noqa: BLE001
                scene_note = f"scene seed failed ({type(exc).__name__}); Unity will open its last scene"
        else:
            scene_note = ("no Library yet - Unity imports the project first, then opens "
                          f"{scene} if it is in build settings")
    if payload.get("dry") in (True, 1, "1", "true", "True", "yes"):  # str(None)=="None" is truthy - that bug made every real boot a dry run
        return jsonify({"ok": True, "dry": True, "editor": str(exe), "project": str(p),
                        "version": version, "scene": scene, "scene_note": scene_note,
                        "assets": len(list((p / "Assets").rglob("*"))) if (p / "Assets").is_dir() else 0})
    # Launch the way a desktop shortcut does: own process group, no inherited handles, a log file
    # so a failure is readable instead of silent, and then PROVE it is still alive. The previous
    # version returned ok=True and no process - which is exactly how "the button does nothing" looks.
    log_path = DATA_HOME / "logs" / f"unity-{slug}.log"
    try:
        log_path.parent.mkdir(parents=True, exist_ok=True)
    except Exception:
        pass
    DETACHED = 0x00000008
    NEW_GROUP = 0x00000200
    try:
        proc = subprocess.Popen(
            [str(exe), "-projectPath", str(p), "-logFile", str(log_path)],
            creationflags=DETACHED | NEW_GROUP, close_fds=False, cwd=str(p),
        )
    except Exception as exc:
        return jsonify({"error": f"failed to start Unity: {type(exc).__name__}: {exc}"}), 500

    deadline = time.time() + 20
    while time.time() < deadline and proc.poll() is None:
        time.sleep(1)
    if proc.poll() is not None:
        tail = ""
        try:
            tail = "\n".join(log_path.read_text(encoding="utf-8", errors="replace").splitlines()[-8:])
        except Exception:
            pass
        return jsonify({"error": f"Unity exited immediately (code {proc.returncode})",
                        "log": str(log_path), "tail": tail}), 500
    return jsonify({"ok": True, "editor": str(exe), "project": str(p), "version": version,
                    "scene": scene, "scene_note": scene_note, "pid": proc.pid,
                    "log": str(log_path),
                    "note": "Unity is up. First open of a project takes ~1 minute."})


@app.get("/api/dispatcher/state")
def api_dispatcher_state():    return jsonify(O.state())


# ------------------------------------------------------------------ dispatcher supervisor
AUTO_FILE = DATA_HOME / "auto.json"
AUTO_DEFAULTS = {
    "enabled": False,
    "project": "",
    "max_attempts": 3,
    "stall_seconds": 1800,     # no output AND no file write for this long = hung
    "cpu_idle_seconds": 0,         # 0 = disabled: waiting for an LLM is zero CPU, not a hang
    "quarantine_hours": 1,
    "retry_window_seconds": 1800,   # only retry failures from the last 30 min
    "max_retries_per_tick": 2,
    "tick_seconds": 20,
    "last_tick": 0,
    "last_action": "",
    "last_action_at": "",
}
_NOISE = {"node_modules", ".git", "library", "temp", "obj", "assets", "site", "__pycache__"}


def _auto_cfg() -> dict:
    cfg = dict(AUTO_DEFAULTS)
    try:
        if AUTO_FILE.exists():
            cfg.update(json.loads(AUTO_FILE.read_text(encoding="utf-8")))
    except Exception:
        pass
    return cfg


def _save_auto(cfg: dict) -> dict:
    merged = dict(AUTO_DEFAULTS)
    merged.update({k: v for k, v in cfg.items() if k in AUTO_DEFAULTS})
    AUTO_FILE.parent.mkdir(parents=True, exist_ok=True)
    AUTO_FILE.write_text(json.dumps(merged, indent=2), encoding="utf-8")
    return merged


def _project_last_write(path: str, depth: int = 4) -> float:
    """Newest mtime under a project, bounded. A hung worker writes nothing, so this is the heartbeat."""
    import os as _os

    root = Path(path)
    if not root.is_dir():
        return 0.0
    newest, base = 0.0, str(root).count("\\")
    for dp, dirs, files in _os.walk(root):
        if str(dp).count("\\") - base >= depth:
            dirs[:] = []
        dirs[:] = [d for d in dirs if d.lower() not in _NOISE]
        for f in files:
            try:
                m = _os.stat(_os.path.join(dp, f)).st_mtime
                if m > newest:
                    newest = m
            except OSError:
                pass
    return newest


FORGE_MANAGED = {"TASKS.json", "BUILD.md", ".lygo-memory", "data", "notes", ".git", ".forge-briefs"}


def _worker_wrote(proj, since: float) -> bool:
    """True only if a file the WORKER owns changed since `since`.

    Excludes what the Forge writes itself: TASKS.json (the board), BUILD.md (contract appends),
    .lygo-memory capsules, data/ and notes. Without this the evidence gate always passed, because
    marking one task done modified TASKS.json and that counted as proof of the next job's work.
    """
    import os as _os

    root = Path(proj)
    if not root.is_dir():
        return False
    for dp, dirs, files in _os.walk(root):
        dirs[:] = [d for d in dirs if d not in FORGE_MANAGED and not d.startswith(".")]
        for f in files:
            if f in FORGE_MANAGED:
                continue
            try:
                if _os.stat(_os.path.join(dp, f)).st_mtime > since:
                    return True
            except OSError:
                pass
    return False


def _task_brief(project: Path, task: dict) -> str:
    """The exact brief a task gets, whether a human dispatched it or the supervisor did."""
    skill = _skill_for_owner(task.get("owner"))
    if task.get("freeform"):
        body = (
            f"FREE BUILD for {project.name}\n\n"
            "There is no board task. The operator note at the end of this file IS the task.\n"
            "Implement it in the game files. Do not produce planning or summary documents.\n"
            + H.build_contract(project, task)
        )
        role, stage = "producer", "build"
        return W.role_brief(role, stage) + "\n\n" + body, skill, role, stage
    body = (
        f"PROJECT BUILD {task['id']}: {task['title']}\n"
        f"Owner role: {task.get('owner')}\n"
        f"Scope: {task.get('description')}\n"
        f"Acceptance: {'; '.join(task.get('acceptance', []))}\n\n"
        "BUILD.md is the contract: a task is done only when a player loading the preview sees or hears "
        "the change. A markdown-only result is BLOCKED, not done.\n"
        "Return RESULT, FILES CHANGED (paths + sizes), PROOF (command + output) and BLOCKERS with the "
        "exact error. Do not mark the task done yourself."
        + "\n" + H.build_contract(project, task)
    )
    role = W.role_for_owner(task.get("owner"))
    stage = W.stage_for_task(task)
    return W.role_brief(role, stage) + "\n\n" + body, skill, role, stage


def _next_ready_task(project: Path) -> dict | None:
    """First pending task whose dependencies are all done."""
    try:
        tasks = H.load_tasks(project) if hasattr(H, "load_tasks") else json.loads(
            (project / "TASKS.json").read_text(encoding="utf-8"))["tasks"]
    except Exception:
        return None
    by_id = {t.get("id"): t for t in tasks}
    for task in tasks:
        if task.get("status") != "pending":
            continue
        if task.get("freeform"):
            continue          # the permanent free-build slot is never auto-picked
        deps = task.get("depends_on") or []
        if all(by_id.get(d, {}).get("status") == "done" for d in deps):
            return task
    return None


_CPU_SAMPLES: dict = {}
_QUARANTINE: dict = {}


def _cpu_seconds(pid: int) -> float:
    try:
        import psutil
        p = psutil.Process(int(pid))
        t = p.cpu_times()
        return float(t.user + t.system)
    except Exception:
        return -1.0


def _agent_quarantined(agent_id: str) -> bool:
    until = _QUARANTINE.get(str(agent_id))
    return bool(until and until > time.time())


def _quarantine(agent_id: str, reason: str, hours: float = 1.0) -> None:
    if not agent_id:
        return
    _QUARANTINE[str(agent_id)] = time.time() + hours * 3600
    try:
        AUTO_FILE.parent.mkdir(parents=True, exist_ok=True)
        data = json.loads(AUTO_FILE.read_text(encoding="utf-8")) if AUTO_FILE.exists() else {}
        data["quarantine"] = _QUARANTINE
        data["quarantine_reason"] = {str(agent_id): reason[:200]}
        AUTO_FILE.write_text(json.dumps(data, indent=2), encoding="utf-8")
    except Exception:
        pass


def _load_quarantine() -> None:
    try:
        if AUTO_FILE.exists():
            data = json.loads(AUTO_FILE.read_text(encoding="utf-8"))
            for k, v in (data.get("quarantine") or {}).items():
                _QUARANTINE[str(k)] = float(v)
    except Exception:
        pass


def _reap_orphans(actions: list | None = None, min_age: int = 60) -> int:
    """Kill untracked worker processes left behind by killed or stalled jobs.

    Uses psutil, not wmic: wmic does not exist on this Windows build (measured 2026-10-28), and the
    first version of this function silently returned 0 forever because of it.
    """
    try:
        import psutil
    except Exception:
        return 0
    try:
        tracked = set(int(v) for v in O.active_pids().values())
    except Exception:
        tracked = set()
    killed = 0
    for p in psutil.process_iter(["pid", "name", "create_time"]):
        try:
            if str(p.info.get("name") or "").lower() != "opencode.exe":
                continue
            pid = int(p.info["pid"])
            if pid in tracked:
                continue
            started = float(p.info.get("create_time") or 0) or time.time()
            if (time.time() - started) < min_age:
                continue
            for child in p.children(recursive=True):
                try:
                    child.kill()
                except Exception:
                    pass
            p.kill()
            killed += 1
        except Exception:
            continue
    if killed and actions is not None:
        actions.append(f"reaped {killed} orphaned worker process(es)")
    return killed


def supervise_once() -> dict:
    """One pass: kill stalls, retry failures, dispatch the next task when idle."""
    cfg = _auto_cfg()
    actions = []
    _reap_orphans(actions)
    now = time.time()
    jobs = O.list_jobs()
    pids = O.active_pids()

    # --- 1. stall detection on working jobs (liveness = newest output, file write, or start)
    for job in [j for j in jobs if j.get("status") == "working"]:
        started = float(job.get("started") or now)
        path = job.get("project_path") or ""
        activity = max(started, _project_last_write(path))
        last_out = float((getattr(O, "LAST_OUTPUT", {}) or {}).get(job["id"], 0) or 0)
        idle = now - max(activity, last_out)
        if idle < float(cfg["stall_seconds"]):
            continue
        pid = pids.get(job["id"])
        if pid:
            O.kill_tree(pid)
        attempts = int(job.get("attempts") or 0)
        if attempts >= int(cfg["max_attempts"]):
            O._finish_job(job["id"], "failed",
                          error=f"stalled: no output and no file activity for {int(idle)}s; {attempts} attempts used")
            actions.append(f"{job['id']} failed after {attempts} attempts (stalled {int(idle)}s)")
        else:
            O.requeue(job["id"], f"stalled: no output for {int(idle)}s - requeued")
            actions.append(f"{job['id']} stalled {int(idle)}s -> requeued")
    # --- 2. retry RECENT failures only, on a worker that can actually do the job
    jobs = O.list_jobs()
    now2 = time.time()
    window = float(cfg.get("retry_window_seconds") or 1800)
    retried = 0
    for job in [j for j in jobs if j.get("status") in ("failed", "timeout")]:
        if retried >= int(cfg.get("max_retries_per_tick") or 2):
            break
        if int(job.get("attempts") or 0) >= int(cfg["max_attempts"]):
            continue
        finished = float(job.get("finished") or 0)
        if finished and (now2 - finished) > window:
            continue                      # history stays history
        if "operator" in str(job.get("error") or "").lower():
            continue                      # stopped by the human
        last = job.get("agent")
        skill = job.get("skill") or ""
        agents = [a for a in O.refresh_agents()
                  if a.get("dispatchable") and a.get("status") in ("ready", "standby")
                  and a.get("id") != last and not O.agent_cooling(a.get("id"))]
        by_skill = [a for a in agents if skill and skill in (a.get("skills") or [])]
        general = [a for a in agents if (a.get("kind") or "") in ("nvidia", "gemini", "opencode", "local", "llm", "master")]
        pool = [a for a in (by_skill or general) if not _agent_quarantined(a.get("id"))]
        # a build task needs a worker that can write files; an API agent writes through _run_api_writer
        if skill in O.BUILD_SKILLS:
            pool = [a for a in pool if O.writes_files(a)]
        if not pool:
            continue
        O.requeue(job["id"], f"auto-retry after {job.get('status')}: {str(job.get('error'))[:160]}")
        pool.sort(key=lambda a: (9 if str(a.get("kind") or "") in ("local", "llm") else 0, a.get("priority", 50)))
        req = job.get("requested_agent")
        if req and any(a.get("id") == req for a in pool):
            res = O.dispatch(job["id"], req)
        else:
            res = O.dispatch(job["id"], pool[0]["id"])
        retried += 1
        actions.append(f"{job['id']} retried on {pool[0]['id']}" if res.get("ok")
                       else f"{job['id']} retry failed: {res.get('error')}")

    # --- 2b. a job sitting queued with no worker must be dispatched, not left waiting for a click
    for job in [j for j in O.list_jobs() if j.get("status") == "queued"]:
        if job.get("agent"):
            continue
        if retried >= int(cfg.get("max_retries_per_tick") or 2):
            break
        # honour the requested worker: a read-the-repo job must not be rerouted to a write-only one
        res = O.dispatch(job["id"], job.get("requested_agent") or None)
        retried += 1
        if res.get("ok"):
            actions.append(f"{job['id']} dispatched to {res['job'].get('agent')}")
        else:
            actions.append(f"{job['id']} stayed queued: {res.get('error')}")

    # --- 3. auto-dispatch the next task when nothing is running
    if cfg.get("enabled") and cfg.get("project"):
        live = [j for j in O.list_jobs() if j.get("status") in ("working", "queued")]
        if not live:
            project = find_project(str(cfg["project"]))
            task = _next_ready_task(project) if project else None
            if project and task:
                brief, skill, role, stage = _task_brief(project, task)
                gate = "AUTO"
                try:
                    job = O.create_job(project.name, str(project), f"{task['id']} · {task['title']}",
                                       brief, skill, agent_id="", auto=True, role=role, stage=stage,
                                       context=C.build(project, task["id"]), gate=gate,
                                       task=task["id"])
                    actions.append(f"auto-dispatched {task['id']} as {job['id']}")
                except Exception as exc:
                    actions.append(f"auto-dispatch {task['id']} failed: {type(exc).__name__}: {exc}")
            elif project and not task:
                actions.append("no ready task (all pending tasks blocked or board complete)")

    # --- 4. apply finished jobs to the board: evidence in, task done, board advances
    try:
        for job in O.list_jobs():
            if job.get("status") not in ("returned", "done"):
                continue
            task_id = str(job.get("task") or "")
            if not task_id or job.get("task_applied"):
                continue
            result = str(job.get("result") or "").strip()
            if not result:
                continue
            proj = find_project(str(job.get("project") or ""))
            if not proj:
                continue
            # evidence gate: the project must have changed during the job, or the result must name a
            # file that exists. "Records prepared" is not an asset.
            started = float(job.get("started") or 0)
            wrote = _worker_wrote(proj, started - 5) if started else False
            named = []
            for token in str(result).replace("`", " ").replace('"', " ").replace("'", " ").split():
                tok = token.strip("(),;:[]{}")
                if "." in tok and len(tok) < 120 and "/" in tok or tok.lower().endswith(
                        (".png", ".glb", ".gltf", ".ogg", ".wav", ".json", ".js", ".md")):
                    named.append(tok)
            # a *mention* is not evidence: the named file must have been written during this job
            exists = False
            for t in named:
                if t.startswith("/"):
                    continue
                cand = proj / t
                try:
                    if cand.exists() and cand.stat().st_mtime > (started - 5):
                        exists = True
                        break
                except OSError:
                    pass
            if not (wrote or exists):
                with O.LOCK:
                    board = O.load_jobs()
                    for j in board:
                        if j.get("id") == job.get("id"):
                            j["task_applied"] = "no-evidence"
                            break
                    O.save_jobs(board)
                actions.append(f"{task_id} NOT closed: no files written by {job.get('agent')}")
                continue
            tasks = H.ensure_task_chain(proj)
            target = next((t for t in tasks if t.get("id") == task_id), None)
            if not target or target.get("status") == "done":
                continue
            ev = "job " + str(job.get("id")) + " (" + str(job.get("agent")) + "): " + result[:1200]
            target.setdefault("evidence", []).append(ev)
            target["status"] = "done"
            H.save_tasks(proj, tasks)
            with O.LOCK:
                board = O.load_jobs()
                for j in board:
                    if j.get("id") == job.get("id"):
                        j["task_applied"] = True
                        break
                O.save_jobs(board)
            actions.append(f"{task_id} marked done from {job.get('id')}")
    except Exception as exc:
        actions.append(f"apply-results failed: {type(exc).__name__}: {exc}")

    # --- 5. master escalation: whatever gave up, the Master finishes
    try:
        escalated = 0
        for job in O.list_jobs():
            if job.get("status") not in ("failed", "timeout"):
                continue
            if job.get("master_escalated"):
                continue
            if str(job.get("gate") or "") == "MASTER" or str(job.get("title") or "").startswith("MASTER"):
                continue
            if int(job.get("attempts") or 0) < int(cfg["max_attempts"]):
                continue
            task_id = str(job.get("task") or "")
            if not task_id:
                continue
            proj = find_project(str(job.get("project") or ""))
            if not proj:
                continue
            tasks = H.ensure_task_chain(proj)
            target = next((t for t in tasks if t.get("id") == task_id), None)
            if not target or target.get("status") == "done":
                continue

            tried = set()
            for other in O.list_jobs():
                if str(other.get("task") or "") == task_id:
                    if other.get("agent"):
                        tried.add(other["agent"])
            pool = [a for a in O.refresh_agents()
                    if a.get("dispatchable") and a.get("status") in ("ready", "standby")
                    and O.writes_files(a)]
            hermes_master = [a for a in pool if a.get("id") == "hermes-master"]
            master_pool = [a for a in pool if "forge-master" in (a.get("skills") or [])]
            fresh = [a for a in pool if a.get("id") not in tried]
            pick = (hermes_master or master_pool or fresh or sorted(pool, key=lambda a: a.get("priority", 50))[:1])
            if not pick:
                actions.append(f"{task_id}: master escalation skipped, no file-writing worker ready")
                continue
            agent = sorted(pick, key=lambda a: a.get("priority", 50))[0]

            history = []
            for other in O.list_jobs():
                if str(other.get("task") or "") == task_id and other.get("status") in ("failed", "timeout"):
                    history.append(f"- {other.get('agent')}: {str(other.get('error') or '')[:200]}")
            brief = (
                f"MASTER ESCALATION - TASK {target['id']}: {target['title']}\n"
                f"Owner role: {target.get('owner')}\n"
                f"Scope: {target.get('description')}\n"
                f"Acceptance: {'; '.join(target.get('acceptance', []))}\n\n"
                "You are the Forge Master. Workers already failed this task:\n"
                + ("\n".join(history[:4]) or "- (no detail recorded)") +
                "\n\nFinish it yourself, now. Suggested only if it is genuinely required: retry the same\n"
                "approach differently, choose a simpler artefact that satisfies the acceptance, or do the\n"
                "work directly. Write real files into the project; a prose answer is a failure.\n"
                "Return RESULT, FILES CHANGED (paths + sizes), EVIDENCE and BLOCKERS.\n"
            )
            mjob = O.create_job(str(job.get("project")), str(proj),
                                f"MASTER -> {target['id']} · {target['title']}",
                                brief, job.get("skill") or "forge-worker",
                                agent_id=agent["id"], auto=True, role="forge-master",
                                stage="production", context=C.build(proj, target["id"]),
                                gate="MASTER", task=target["id"])
            with O.LOCK:
                board = O.load_jobs()
                for j in board:
                    if j.get("id") == job.get("id"):
                        j["master_escalated"] = True
                    if j.get("id") == mjob.get("id"):
                        j["attempts"] = 0
                O.save_jobs(board)
            escalated += 1
            actions.append(f"{task_id} escalated to MASTER as {mjob.get('id')} "
                           f"(worker {mjob.get('agent') or agent['id']})")
            if escalated >= 1:
                break
    except Exception as exc:
        actions.append(f"master escalation failed: {type(exc).__name__}: {exc}")

    if actions:
        cfg = _auto_cfg()
        cfg["last_action"] = " | ".join(actions)[:500]
        cfg["last_action_at"] = time.strftime("%Y-%m-%dT%H:%M:%S")
        _save_auto(cfg)
    return {"actions": actions, "at": time.strftime("%Y-%m-%dT%H:%M:%S")}


_load_quarantine()


def _supervisor_loop() -> None:
    while True:
        try:
            cfg = _auto_cfg()
            time.sleep(max(5, int(cfg.get("tick_seconds") or 20)))
            supervise_once()
        except Exception:
            time.sleep(10)


@app.get("/api/dispatcher/auto")
def api_auto_get():
    cfg = _auto_cfg()
    return jsonify({"auto": cfg, "pids": O.active_pids()})


@app.post("/api/dispatcher/auto")
def api_auto_set():
    payload = request.get_json(silent=True) or {}
    cfg = _auto_cfg()
    for key in ("enabled", "project", "max_attempts", "stall_seconds", "tick_seconds"):
        if key in payload:
            cfg[key] = payload[key]
    cfg["enabled"] = bool(cfg.get("enabled"))
    cfg = _save_auto(cfg)
    return jsonify({"ok": True, "auto": cfg})


@app.post("/api/dispatcher/supervise")
def api_supervise_now():
    return jsonify(supervise_once())


@app.get("/api/dispatcher/output/<job_id>")
def api_job_output(job_id: str):
    """Live worker output for a running job (last 60 lines) plus its last-output timestamp."""
    lines = (getattr(O, "OUTPUT_LINES", {}) or {}).get(job_id, [])
    last = (getattr(O, "LAST_OUTPUT", {}) or {}).get(job_id)
    age = round(time.time() - float(last), 1) if last else None
    return jsonify({"job": job_id, "last_output_seconds_ago": age, "lines": lines[-60:]})


@app.get("/api/dispatcher/agents")
def api_dispatcher_agents():
    return jsonify({"agents": O.refresh_agents()})


PROBE_COOLDOWN = 12          # seconds between manual refreshes of one card - focused, never spammy
_PROBE_STATE: dict = {}      # agent_id -> {"next": epoch, "fails": int}
_PROBE_LOG = DATA_HOME / "logs" / "agent-refresh.log"


def _log_probe(agent_id: str, ok: bool, agent: dict, note: str = "") -> None:
    """Append one jsonl line per manual refresh so the Forge master can read why a card is down."""
    try:
        _PROBE_LOG.parent.mkdir(parents=True, exist_ok=True)
        rec = {"at": time.strftime("%Y-%m-%dT%H:%M:%S"), "agent": agent_id,
               "ok": bool(ok), "status": agent.get("status"), "detail": agent.get("detail", ""),
               "kind": agent.get("kind"), "note": note}
        with open(_PROBE_LOG, "a", encoding="utf-8") as fh:
            fh.write(json.dumps(rec, ensure_ascii=False) + "\n")
    except Exception:
        pass


@app.post("/api/dispatcher/agents/<agent_id>/probe")
def api_dispatcher_probe(agent_id: str):
    now = time.time()
    st = _PROBE_STATE.setdefault(agent_id, {"next": 0.0, "fails": 0})
    if now < st["next"]:
        wait = int(round(st["next"] - now))
        return jsonify({"ok": False, "cooldown": wait,
                        "error": "Refresh cooling down - %ds left. Focused retries only." % wait}), 429
    agents = O.refresh_agents()
    agent = next((a for a in agents if a["id"] == agent_id), None)
    if not agent:
        return jsonify({"error": "agent not found"}), 404
    ok = agent.get("status") == "ready"
    st["next"] = now + PROBE_COOLDOWN
    if ok:
        st["fails"] = 0
        _log_probe(agent_id, True, agent)
        return jsonify({"ok": True, "agent": agent, "retry_in": PROBE_COOLDOWN})
    st["fails"] += 1
    _log_probe(agent_id, False, agent, note="attempt %d" % st["fails"])
    return jsonify({"ok": False, "agent": agent, "retry_in": PROBE_COOLDOWN,
                    "error": agent.get("detail") or "still offline"}), 200


@app.post("/api/dispatcher/jobs")
def api_dispatcher_create_job():
    payload = request.get_json(silent=True) or {}
    slug = str(payload.get("project") or "")
    project = find_project(slug)
    if not project:
        return jsonify({"error": "project not found"}), 404
    title = str(payload.get("title") or "Forge dispatch job").strip()
    brief = str(payload.get("brief") or "").strip()
    skill = str(payload.get("skill") or "forge-worker")
    if not brief:
        return jsonify({"error": "brief required"}), 400
    job = O.create_job(slug, str(project), title, brief, skill,
                       agent_id=str(payload.get("agent") or ""),
                       auto=bool(payload.get("auto", True)),
                       role=str(payload.get("role") or ""),
                       stage=str(payload.get("stage") or ""))
    return jsonify({"ok": True, "job": job}), 201


@app.post("/api/dispatcher/jobs/<job_id>/dispatch")
def api_dispatcher_dispatch(job_id: str):
    payload = request.get_json(silent=True) or {}
    result = O.dispatch(job_id, str(payload.get("agent") or "") or None)
    return jsonify(result), (200 if result.get("ok") else 400)


@app.post("/api/dispatcher/jobs/<job_id>/approve")
def api_dispatcher_approve(job_id: str):
    payload = request.get_json(silent=True) or {}
    result = O.approve(job_id, str(payload.get("verdict") or "accepted"),
                       str(payload.get("note") or ""))
    return jsonify(result), (200 if result.get("ok") else 400)


@app.post("/api/dispatcher/jobs/<job_id>/retry")
def api_dispatcher_retry(job_id: str):
    payload = request.get_json(silent=True) or {}
    result = O.retry(job_id, str(payload.get("agent") or "") or None)
    return jsonify(result), (200 if result.get("ok") else 400)


@app.post("/api/dispatcher/test")
def api_dispatcher_test():
    payload = request.get_json(silent=True) or {}
    slug = str(payload.get("project") or "lattice-arena")
    project = find_project(slug)
    if not project:
        return jsonify({"error": "project not found"}), 404
    brief = (
        "READ-ONLY DISPATCHER VERIFICATION. Do not edit any game file, tool or project source. "
        "Return exactly one line: FORGE_DISPATCH_OK. "
        "Then add one sentence naming the project and one recommended next QA check. "
        "This is a routing/lifecycle test only; no file access or build is required."
    )
    job = O.create_job(slug, str(project), "Dispatcher smoke test — read-only",
                       brief, "forge-qa-worker", agent_id="local-qwen", auto=True)
    return jsonify({"ok": True, "job": job}), 201


@app.post("/api/dispatcher/blender-test")
def api_dispatcher_blender_test():
    payload = request.get_json(silent=True) or {}
    slug = str(payload.get("project") or "lattice-arena")
    project = find_project(slug)
    if not project:
        return jsonify({"error": "project not found"}), 404
    brief = (
        "BLENDER WORKER BOOT TEST. Run headless Blender, print its version, create a default cube "
        "and export a GLB to the Forge jobs folder. Do not touch the game project. "
        "Return FORGE_BLENDER_OK and the GLB path."
    )
    job = O.create_job(slug, str(project), "Blender worker smoke test",
                       brief, "forge-blender-worker", agent_id="blender-local", auto=True)
    return jsonify({"ok": True, "job": job}), 201


@app.get("/api/gauntlet/latest")
def api_gauntlet_latest():
    return jsonify(G.latest())


@app.post("/api/gauntlet/run")
def api_gauntlet_run():
    payload = request.get_json(silent=True) or {}
    ids = payload.get("agents") or None
    threading.Thread(target=G.run_gauntlet, args=(ids,), daemon=True).start()
    return jsonify({"ok": True, "started": True}), 202


@app.get("/api/tools")
def api_tools():
    agents = O.refresh_agents()
    return jsonify({"tools": T.all_tools(agents)})


@app.post("/api/tools/<tool>/test")
def api_tool_test(tool: str):
    meta = T.TOOLS.get(tool)
    if not meta:
        return jsonify({"error": "unknown tool"}), 404
    if not meta.get("test"):
        return jsonify({"error": "no supported headless adapter", "limits": meta.get("limits")}), 409
    if tool == "pdhowler":
        project = find_project("forge-gauntlet-sandbox")
        if not project:
            return jsonify({"error": "gauntlet sandbox project not registered"}), 404
        job = O.create_job(
            "forge-gauntlet-sandbox", str(project), "PD Howler conversion smoke test",
            "Convert a generated gradient source to a 64x64 PNG in assets/working. No painting claim.",
            "forge-pdhowler-worker", agent_id="pdhowler", auto=True,
            role="2d-artist", stage="production")
    elif tool == "rpgmaker-mv":
        job = O.create_job(
            "rpgmaker-mv", str(O.RPGMAKER_PROJECT), "RPG Maker MV project validation",
            "Read-only validation of data/System.json, Actors.json and Map*.json. No writes.",
            "forge-rpgmaker-worker", agent_id="rpgmaker-mv", auto=True,
            role="level-designer", stage="production")
    else:
        return jsonify({"error": "adapter not implemented"}), 409
    return jsonify({"ok": True, "job": job}), 201


@app.post("/api/tools/rpgmaker-mv/author-test")
def api_rpg_author_test():
    sandbox = O.RPGMAKER_AUTHOR_HOME
    if not sandbox.exists():
        sandbox.parent.mkdir(parents=True, exist_ok=True)
        shutil.copytree(O.RPGMAKER_PROJECT, sandbox)
    job = O.create_job(
        "rpgmaker-tool-sandbox", str(sandbox), "RPG Maker MV event author test",
        "Create one new map event with a Show Text command in the disposable sandbox. Back up the map, write atomically, validate and report rollback.",
        "forge-rpgmaker-author-worker", agent_id="rpgmaker-mv", auto=True,
        role="level-designer", stage="production")
    return jsonify({"ok": True, "job": job, "sandbox": str(sandbox)}), 201


@app.post("/api/tools/rpgmaker-mv/rollback")
def api_rpg_rollback():
    try:
        return jsonify({"ok": True, **O.rollback_rpgmaker()})
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400


@app.get("/api/workflow")
def api_workflow():
    return jsonify(W.summary())


@app.get("/api/workflow/stages")
def api_workflow_stages():
    return jsonify({"stages": W.stages()})


@app.get("/api/workflow/roles")
def api_workflow_roles():
    return jsonify({"roles": W.roles()})


@app.get("/api/skills/<skill>/notes")
def api_skill_notes(skill: str):
    try:
        return jsonify({"skill": skill, "notes": N.list_notes(skill)})
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400


@app.post("/api/skills/<skill>/notes")
def api_skill_note_add(skill: str):
    try:
        note = N.add_note(skill, request.get_json(silent=True) or {})
        return jsonify({"ok": True, "note": note}), 201
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400


@app.post("/api/skills/<skill>/notes/<note_id>/read")
def api_skill_note_read(skill: str, note_id: str):
    payload = request.get_json(silent=True) or {}
    try:
        return jsonify({"ok": True, "note": N.mark_read(skill, note_id, str(payload.get("reader") or "operator"))})
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 404


@app.post("/api/opencode/reset")
def api_opencode_reset():
    O.reset_opencode_quota()
    return jsonify({"ok": True, "reset": True})


@app.get("/api/notes/approvals")
def api_note_approvals():
    return jsonify({"approvals": N.list_approvals()})


@app.post("/api/skills/<skill>/notes/<note_id>/resolve")
def api_note_resolve(skill: str, note_id: str):
    try:
        note = N.resolve_note(skill, note_id, request.get_json(silent=True) or {})
        fulfillment = None
        req = (note.get("meta") or {}).get("asset_request")
        if note.get("resolution") == "approved" and req:
            project = find_project(str(req.get("project") or ""))
            if not project:
                N.annotate_note(skill, note_id, {"fulfill_error": "project not found"})
            else:
                try:
                    result = A.fetch(str(req.get("project")), str(project), {**req, "approve_restricted": True})
                    asset = result["asset"]
                    fulfillment = {"asset_id": asset["id"], "path": asset["path"], "hash": asset["hash"]}
                    N.annotate_note(skill, note_id, {"fulfillment": fulfillment})
                    target = str(req.get("to") or "forge-image-worker")
                    try:
                        N.add_note(target, {
                            "from": "asset-bot", "to": target, "kind": "asset", "job": asset.get("task"),
                            "message": f"Approved asset available: {asset['id']} — {asset['path']}.",
                            "paths": [asset["path"]], "requires_action": True,
                        })
                    except ValueError:
                        pass
                except ValueError as exc:
                    N.annotate_note(skill, note_id, {"fulfill_error": str(exc)})
        return jsonify({"ok": True, "note": note, "fulfillment": fulfillment})
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400


@app.get("/api/assets/sources")
def api_asset_sources():
    return jsonify(A.sources())


@app.get("/api/assets/folders")
def api_asset_folders():
    project = str(request.args.get("project") or "")
    return jsonify({"folders": A.folders(project or None),
                    "count": len(A.folders(project or None))})


@app.post("/api/assets/folders")
def api_asset_folder_register():
    payload = request.get_json(silent=True) or {}
    project = str(payload.get("project") or "")
    try:
        rec = A.register_folder(project, str(payload.get("path") or ""),
                                kind=str(payload.get("kind") or "mixed"),
                                note=str(payload.get("note") or ""),
                                label=str(payload.get("label") or ""))
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    return jsonify({"ok": True, "folder": rec})


@app.post("/api/assets/folders/remove")
def api_asset_folder_remove():
    payload = request.get_json(silent=True) or {}
    key = str(payload.get("id") or payload.get("path") or "")
    return jsonify({"ok": A.unregister_folder(key)})


@app.post("/api/assets/discover")
def api_asset_discover():
    """Read-only crawl. Pass register=true to also track every hit for a project."""
    payload = request.get_json(silent=True) or {}
    roots = payload.get("roots") or [r"D:\\", r"<USER>"]
    project = str(payload.get("project") or "")
    try:
        found = A.discover([str(r) for r in roots],
                           max_depth=int(payload.get("max_depth") or 5),
                           min_images=int(payload.get("min_images") or 5))
    except Exception as exc:
        return jsonify({"error": str(exc)}), 400
    registered = 0
    if payload.get("register"):
        # discovered trees go into the shared index ("*") unless a project claims them
        owner = project or "*"
        for row in found:
            try:
                A.register_folder(owner, row["path"], kind="mixed",
                                  note="discovered " + time.strftime("%Y-%m-%d"))
                registered += 1
            except ValueError:
                pass
    return jsonify({"found": found, "count": len(found), "registered": registered})


@app.get("/api/skills")
def api_skills_list():
    """Browse the Forge skill library. A skill is a folder with a SKILL.md."""
    rows = []
    base = A.SKILLS_DIR
    if base.is_dir():
        for d in sorted(base.iterdir()):
            f = d / "SKILL.md"
            if not d.is_dir() or not f.is_file():
                continue
            try:
                text = f.read_text(encoding="utf-8", errors="replace")
            except OSError:
                continue
            name, desc = d.name, ""
            fm = re.match(r"^---\s*(.*?)\s*---", text, re.S)
            if fm:
                for line in fm.group(1).splitlines():
                    if line.startswith("name:"):
                        name = line.split(":", 1)[1].strip() or d.name
                    elif line.startswith("description:"):
                        desc = line.split(":", 1)[1].strip().strip('"')
            rows.append({"id": d.name, "name": name, "description": desc[:240],
                         "path": str(d), "bytes": f.stat().st_size,
                         "references": (d / "references").is_dir(),
                         "tools": (d / "tools").is_dir()})
    return jsonify({"skills": rows, "count": len(rows), "root": str(base)})


# ---------------------------------------------------------------- schematic board
# Each project can host one "paper": a generated structure map the agents read before they touch
# the game. The board is a file in the project; the ledger is append-only and lives in Forge data,
# so the shape of the project is always traceable in order.
SCHEMATIC_DIR = DATA_HOME / "schematic"
SCHEMATIC_CANDIDATES = ("docs/GAME-INDEX.txt", "docs/ENGINEERING.txt", "docs/SCHEMATIC.txt",
                        "docs/SCHEMATIC.md", "SCHEMATIC.md", "docs/GAME-MAP.md")


def _schematic_board(project: Path) -> Path | None:
    for rel in SCHEMATIC_CANDIDATES:
        p = project / rel
        if p.is_file():
            return p
    return None


def _schematic_ledger_path(slug: str) -> Path:
    SCHEMATIC_DIR.mkdir(parents=True, exist_ok=True)
    return SCHEMATIC_DIR / (slug + ".jsonl")


def _schematic_ledger(slug: str, limit: int = 200) -> list[dict]:
    path = _schematic_ledger_path(slug)
    if not path.exists():
        return []
    rows = []
    for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            rows.append(json.loads(line))
        except Exception:
            continue
    return rows[-limit:]


@app.get("/api/projects/<slug>/schematic")
def api_schematic(slug: str):
    project = find_project(slug)
    if not project:
        return jsonify({"error": "project not found"}), 404
    board = _schematic_board(project)
    text = ""
    if board:
        text = board.read_text(encoding="utf-8", errors="replace")
    return jsonify({
        "slug": slug,
        "board": text,
        "path": str(board) if board else "",
        "bytes": len(text.encode("utf-8")),
        "lines": text.count("\n") + (1 if text else 0),
        "ledger": _schematic_ledger(slug),
    })


@app.post("/api/projects/<slug>/schematic/ledger")
def api_schematic_ledger_append(slug: str):
    project = find_project(slug)
    if not project:
        return jsonify({"error": "project not found"}), 404
    payload = request.get_json(silent=True) or {}
    note = str(payload.get("note") or "").strip()
    if not note:
        return jsonify({"error": "note required"}), 400
    board = _schematic_board(project)
    entry = {
        "ts": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "kind": str(payload.get("kind") or "note")[:40],
        "author": str(payload.get("author") or "agent")[:40],
        "note": note[:2000],
        "board": board.name if board else "",
    }
    path = _schematic_ledger_path(slug)
    with path.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(entry) + "\n")
    return jsonify({"ok": True, "entry": entry, "count": len(_schematic_ledger(slug))})




@app.get("/api/assets")
def api_assets():
    project = find_project(str(request.args.get("project") or ""))
    if not project:
        return jsonify({"error": "project not found"}), 404
    return jsonify(A.summary(str(request.args.get("project") or "")))


@app.post("/api/assets/fetch")
def api_asset_fetch():
    payload = request.get_json(silent=True) or {}
    project = find_project(str(payload.get("project") or ""))
    if not project:
        return jsonify({"error": "project not found"}), 404
    source_id = str(payload.get("source_id") or "")
    source = next((x for x in A.sources().get("sources", []) if x.get("id") == source_id), None)
    if not source:
        return jsonify({"error": "unknown source_id"}), 400
    if source.get("license") != "CC0":
        approval = str(payload.get("approval_note") or "")
        if approval:
            try:
                note = N.get_note("forge-master", approval)
            except ValueError as exc:
                return jsonify({"error": str(exc)}), 400
            req = (note.get("meta") or {}).get("asset_request") or {}
            if note.get("resolution") != "approved":
                return jsonify({"error": "approval note is not approved"}), 400
            if any(req.get(k) != payload.get(k) for k in ("source_id", "url", "license", "project")):
                return jsonify({"error": "approval does not match this asset request"}), 400
        else:
            req = {
                "project": str(payload.get("project")), "project_path": str(project),
                "source_id": source_id, "url": str(payload.get("url") or ""),
                "license": str(payload.get("license") or ""), "attribution": str(payload.get("attribution") or ""),
                "kind": str(payload.get("kind") or "reference"), "owner": str(payload.get("owner") or "asset-bot"),
                "task": str(payload.get("task") or ""), "to": str(payload.get("to") or "forge-image-worker"),
            }
            for existing in N.list_approvals():
                old = (existing.get("meta") or {}).get("asset_request") or {}
                if all(old.get(k) == req.get(k) for k in ("project", "source_id", "url", "license")):
                    return jsonify({"ok": True, "pending": True, "approval": existing,
                                    "message": "Identical approval request already pending."}), 202
            note = N.add_note("forge-master", {
                "from": "asset-bot", "to": "forge-master", "kind": "approval",
                "job": req["task"], "message": f"Approve restricted asset fetch: {req['url']} ({req['license']}).",
                "paths": [req["url"]], "meta": {"asset_request": req},
            })
            return jsonify({"ok": True, "pending": True, "approval": note,
                            "message": "Restricted asset requires approval; no download performed."}), 202
    try:
        result = A.fetch(str(payload.get("project") or ""), str(project), {**payload, "approve_restricted": True})
        asset = result["asset"]
        target = str(payload.get("to") or "forge-image-worker")
        N.add_note("forge-asset-pointer", {
            "from": "asset-bot", "to": "forge-asset-pointer", "kind": "asset",
            "job": asset.get("task"), "message": f"Fetched {asset['id']} from {asset['source_url']} ({asset['license']}); registered as candidate.",
            "paths": [asset["path"]],
        })
        try:
            N.add_note(target, {
                "from": "asset-bot", "to": target, "kind": "asset",
                "job": asset.get("task"), "message": f"New asset available: {asset['id']} — {asset['path']}. Verify dimensions, scale, licence and engine fit before use.",
                "paths": [asset["path"]], "requires_action": True,
            })
        except ValueError:
            pass
        return jsonify({"ok": True, **result}), 201
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400


@app.post("/api/assets/pointer")
def api_asset_pointer():
    payload = request.get_json(silent=True) or {}
    project = find_project(str(payload.get("project") or ""))
    if not project:
        return jsonify({"error": "project not found"}), 404
    try:
        record = A.add_pointer(str(payload.get("project") or ""), str(project), payload)
        return jsonify({"ok": True, "asset": record}), 201
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400


@app.get("/api/dispatcher/skills")
def api_dispatcher_skills():
    skills = []
    for p in sorted((ROOT / "skills").glob("*/SKILL.md")):
        skills.append({"id": p.parent.name, "path": str(p), "title": p.read_text(encoding="utf-8", errors="replace").splitlines()[0].lstrip("# ").strip()})
    return jsonify({"skills": skills})


def _skill_for_owner(owner: str) -> str:
    return W.skill_for_owner(owner)


@app.post("/api/projects/<slug>/assets/upload")
def api_asset_upload(slug: str):
    """Register a locally produced asset (Piskel export, Blender render, recorded audio).

    multipart: file (required), license, attribution, task, owner, kind
    Writes to <project>/assets/_inbox/ and appends to assets/manifests/assets.json as 'candidate'.
    It is NOT imported into the engine - the art director / technical artist accept it first.
    """
    project = find_project(slug)
    if not project:
        return jsonify({"error": "project not found"}), 404
    up = request.files.get("file")
    if not up or not up.filename:
        return jsonify({"error": "file required"}), 400

    import hashlib
    import re as _re

    safe = _re.sub(r"[^A-Za-z0-9._-]+", "-", Path(up.filename).name).strip("-") or "asset.bin"
    if safe.startswith(".") or ".." in safe:
        return jsonify({"error": "bad filename"}), 400
    suffix = Path(safe).suffix.lower()
    allowed = {".png", ".gif", ".jpg", ".jpeg", ".webp", ".json", ".ogg", ".wav", ".mp3",
               ".glb", ".gltf", ".rbxm", ".piskel"}
    if suffix not in allowed:
        return jsonify({"error": f"unsupported type {suffix}", "allowed": sorted(allowed)}), 400

    inbox = project / "assets" / "_inbox"
    inbox.mkdir(parents=True, exist_ok=True)
    dest = inbox / safe
    data = up.read()
    if len(data) > 20 * 1024 * 1024:
        return jsonify({"error": "max 20 MB"}), 400
    dest.write_bytes(data)
    digest = hashlib.sha256(data).hexdigest()

    manifest_dir = project / "assets" / "manifests"
    manifest_dir.mkdir(parents=True, exist_ok=True)
    manifest = manifest_dir / "assets.json"
    try:
        entries = json.loads(manifest.read_text(encoding="utf-8")) if manifest.exists() else []
    except Exception:
        entries = []
    if isinstance(entries, dict):
        entries = entries.get("assets", [])
    entry = {
        "path": f"assets/_inbox/{safe}",
        "kind": str(request.form.get("kind") or suffix.lstrip(".")),
        "source": "local-import",
        "license": str(request.form.get("license") or "operator-declared"),
        "attribution": str(request.form.get("attribution") or ""),
        "sha256": digest,
        "bytes": len(data),
        "owner": str(request.form.get("owner") or "operator"),
        "task": str(request.form.get("task") or ""),
        "status": "candidate",
        "added": time.strftime("%Y-%m-%dT%H:%M:%S"),
    }
    entries.append(entry)
    manifest.write_text(json.dumps(entries, indent=2), encoding="utf-8")
    return jsonify({"ok": True, "asset": entry, "destination": str(dest)}), 201


@app.post("/api/projects/<slug>/build/free")
def api_build_free(slug: str):
    """A build with no task attached: operator prompt + BUILD.md contract -> a real job.

    payload: {prompt, agent?, skill?, dispatch?}
      agent    - an agent id from /api/dispatcher/agents (default: let the dispatcher choose)
      skill    - override the worker skill (default forge-worker)
      dispatch - default true: send it to the worker immediately
    """
    project = find_project(slug)
    if not project:
        return jsonify({"error": "project not found"}), 404
    payload = request.get_json(silent=True) or {}
    prompt = str(payload.get("prompt") or "").strip()
    if not prompt:
        return jsonify({"error": "prompt required"}), 400

    # Do NOT paste the contract into the prompt. Measured 2026-10-28: a long brief made the worker
    # read the whole project and produce nothing for 220s, while the same instruction alone finished
    # in 5.6s. Point at the file; let the worker read what it needs.
    contract = ""
    bf = project / "BUILD.md"
    if bf.is_file():
        contract = "BUILD.md"

    title = "FREE BUILD: " + (prompt[:64] + ("…" if len(prompt) > 64 else ""))
    brief = (
        f"FREE BUILD — no phase task. Operator instruction:\n{prompt}\n\n"
        f"Project: {project}\n"
        "This is a BUILD request, not a planning request. Produce real files and prove them.\n"
        "A markdown-only answer is a BLOCKED result.\n\n"
        "Evidence to return: FILES CHANGED (paths + sizes), what a player now sees/hears, and the "
        "REFRESH readout (served <age> · sha <hash> · <n> files newer than the page).\n"
    )
    if contract:
        brief += ("\nRead BUILD.md in the project root first - it is the build contract. "
                  "Read nothing else unless the task truly needs it.\n")

    skill = str(payload.get("skill") or "forge-worker")
    job = O.create_job(slug, str(project), title, brief, skill,
                       agent_id=str(payload.get("agent") or ""),
                       auto=bool(payload.get("dispatch", True)),  # False = queue only, do not send to a worker
                       role="free-build", stage="build", gate="FREE")
    warning = ""
    if job.get("requested_agent") and job.get("agent") and job["agent"] != job["requested_agent"]:
        warning = (f"requested {job['requested_agent']} but the dispatcher assigned {job['agent']}")
    if job.get("error"):
        warning = warning or job["error"]
    return jsonify({"ok": True, "job": job, "used_contract": bool(contract), "warning": warning}), 201


@app.post("/api/dispatcher/from-task")
def api_dispatcher_from_task():
    payload = request.get_json(silent=True) or {}
    slug = str(payload.get("project") or "")
    project = find_project(slug)
    if not project:
        return jsonify({"error": "project not found"}), 404
    tasks = H.ensure_task_chain(project)
    task_id = str(payload.get("task") or "")
    task = next((t for t in tasks if t["id"] == task_id), None)
    if not task:
        return jsonify({"error": "task not found"}), 404
    if task.get("status") == "done":
        return jsonify({"error": "task is already done"}), 400
    tasks = H.ensure_task_chain(project)
    by_id = {t["id"]: t for t in tasks}
    missing = [d for d in task.get("depends_on", []) if by_id.get(d, {}).get("status") != "done"]
    if missing and not bool(payload.get("force")):
        return jsonify({"error": "dependencies incomplete: " + ", ".join(missing),
                        "missing": missing, "gate": "blocked"}), 409
    gate = "FORCED: " + ", ".join(missing) if missing else "OPEN"
    skill = _skill_for_owner(task.get("owner"))
    brief = (
        f"PROJECT TASK {task['id']}: {task['title']}\n"
        f"Owner role: {task.get('owner')}\n"
        f"Scope: {task.get('description')}\n"
        f"Acceptance: {'; '.join(task.get('acceptance', []))}\n\n"
        "Read BUILD.md FIRST, then GAME.md, GDD.md, ART_BIBLE.md, ASSET_PLAN.md, PLAN.md, TASKS.json, TECH_SPEC.md and QA.md.\n"
        "Asset sources and licence rules: forge\\docs\\ASSET-SOURCES.md. Spec review method: forge\\docs\\SPEC-REVIEW.md.\n"
        "BUILD.md is the contract: a task is done only when a player loading the preview sees or hears the change.\n"
        "A markdown-only or plan-only result is BLOCKED, not done. Produce real files: HUD/UI, art assets in assets/, \n"
        "an authored level, effects and audio as the task requires, and install each one in the code that uses it.\n"
        "Do not add features outside this task's scope, but DO produce every artefact this task's scope names.\n"
        "Return RESULT, FILES CHANGED (paths + sizes), EVIDENCE (screenshot or the REFRESH readout: sha + files newer)\n"
        "and BLOCKERS with the exact command and error. Do not mark the task done yourself."
    )
    role = W.role_for_owner(task.get("owner"))
    stage = W.stage_for_task(task)
    brief = W.role_brief(role, stage) + "\n\n" + brief
    job = O.create_job(slug, str(project), f"{task['id']} · {task['title']}", brief, skill,
                       agent_id=str(payload.get("agent") or ""), auto=True, role=role, stage=stage,
                       context=C.build(project, task["id"]), gate=gate, task=task_id)
    return jsonify({"ok": True, "task": task, "job": job}), 201


@app.get("/api/files/<slug>")
def api_files(slug: str):
    project = find_project(slug)
    if not project:
        return jsonify({"error": "not found"}), 404
    files = []
    for p in project.rglob("*"):
        if p.is_file() and ".git" not in p.parts and "node_modules" not in p.parts:
            files.append(str(p.relative_to(project)).replace("\\", "/"))
            if len(files) >= 500:
                break
    return jsonify({"files": sorted(files)})


def main():
    DATA_HOME.mkdir(parents=True, exist_ok=True)
    JOBS_DIR.mkdir(parents=True, exist_ok=True)
    # migrate the early dev registry into the persistent home
    old = ROOT / "projects.json"
    if old.exists() and not REGISTRY.exists():
        shutil.copy2(old, REGISTRY)
    if not OPENCODE.exists():
        print(f"WARNING: OpenCode not found at {OPENCODE}")
    print(f"LYGO FORGE on http://{HOST}:{PORT}")
    if os.environ.get("LYGO_FORGE_NO_BROWSER") != "1":
        threading.Timer(0.8, lambda: webbrowser.open(f"http://{HOST}:{PORT}/")).start()
    # the supervisor must start BEFORE app.run blocks, or it never runs at all
    try:
        import threading as _th
        _th.Thread(target=_supervisor_loop, daemon=True, name="forge-supervisor").start()
        print("[forge] dispatcher supervisor started", flush=True)
    except Exception as exc:
        print(f"[forge] supervisor failed to start: {exc}", flush=True)
    app.run(host=HOST, port=PORT, debug=False, threaded=True)


if __name__ == "__main__":
    main()

