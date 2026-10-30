"""LYGO Forge Dispatcher / Forge Master.

Deterministic job orchestration for local, OpenCode, NVIDIA, Hermes and
shared-bus workers. No paid services, no hidden scope.
"""
from __future__ import annotations

import json
import os
import shutil
import re
import subprocess
import threading
import time
import urllib.request
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DATA_HOME = Path(os.environ.get("LYGO_FORGE_HOME", r"<FORGE_DIR>\data"))
AGENTS_FILE = DATA_HOME / "agents.json"
JOBS_FILE = DATA_HOME / "jobs-board.json"
SKILLS_DIR = ROOT / "skills"
PROJECTS_ROOT = Path(os.environ.get("LYGO_FORGE_PROJECTS", r"<PROJECTS>"))
OPENCODE = Path(os.environ.get("LYGO_OPENCODE", r"<USER>\AppData\Roaming\npm\node_modules\opencode-ai\bin\opencode.exe"))
OPENCODE_QUOTA_FILE = DATA_HOME / "opencode-quota.json"
GEMINI_API = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
GEMINI_BIN = Path(os.environ.get("LYGO_GEMINI", r"<USER>\AppData\Roaming\npm\gemini.cmd"))
LYGO_API_JSON = Path(os.environ.get("LYGO_API_JSON",
                                    r"<CONSOLE_DIR>\config\api.json"))
UNITY_CLI = Path(os.environ.get("LYGO_UNITY_CLI", r"<USER>\AppData\Local\Unity\bin\unity.exe"))
HERMES = Path(os.environ.get("LYGO_HERMES", r"<USER>\AppData\Local\hermes\bin\hermes.cmd"))
BLENDER = Path(os.environ.get("LYGO_BLENDER", r"J:\SteamLibrary\steamapps\common\Blender\blender.exe"))
PDHOWLER_DIR = Path(os.environ.get("LYGO_PDHOWLER", r"J:\SteamLibrary\steamapps\common\PD_Howler_11"))
PDHOWLER_CONVERT = PDHOWLER_DIR / "convert.exe"
FOUNDRY_ROOT = Path(os.environ.get("LYGO_FOUNDRY", r"<DRIVE_D>\LYGO\asset-foundry"))
FOUNDRY_PY = Path(os.environ.get("LYGO_FOUNDRY_PY", r"C:\Python313\python.exe"))
FOUNDRY_FORGE = FOUNDRY_ROOT / "forge.py"
RPGMAKER_PROJECT = Path(os.environ.get("LYGO_RPGMAKER_PROJECT", r"J:\SteamLibrary\steamapps\common\RPG Maker MV\NewData"))
SHARED_ROOT = Path(os.environ.get("LYGO_SHARED_ROOT", r"<DRIVE_D>\LYGO_SHARED"))
SHARED_CLI = SHARED_ROOT / "tools" / "shared_task.py"
FOUNDRY_LOCK = threading.Lock()
PYTHON = Path(r"C:\Python313\python.exe")
FORGE_INSTALL = Path(os.environ.get("LYGO_FORGE_INSTALL", r"<FORGE_DIR>"))
PIPELINE = FORGE_INSTALL / "pipeline"
NODE = Path(os.environ.get("LYGO_NODE", r"C:\Program Files\nodejs\node.exe"))
PIPER_BIN = Path(os.environ.get("LYGO_PIPER", r"<MEDIA>\tools\piper\piper.exe"))
LOCK = threading.RLock()

AGENT_DEFAULTS = [
    {
        "id": "hermes-master", "name": "Hermes / Forge Master", "kind": "master",
        "endpoint": "http://127.0.0.1:8082/v1", "model": "nvidia/nemotron-3-ultra-550b-a55b",
        "skills": ["forge-master", "forge-worker", "forge-web-worker", "forge-qa-worker"],
        "dispatchable": True,
        "priority": 0, "fallback": "local-qwen",
        "note": "Overseer & Master Builder. Primary Free API (NVIDIA 8082 / Gemini) with automatic fallback to Local Engine (8081).",
    },
    {
        "id": "nvidia-nemotron", "name": "NVIDIA Nemotron Ultra 550B", "kind": "nvidia",
        "endpoint": "http://127.0.0.1:8082/v1", "model": "nvidia/nemotron-3-ultra-550b-a55b",
        "skills": ["forge-worker", "forge-qa-worker", "forge-web-worker", "forge-ui-worker", "forge-unity-worker", "forge-blender-worker", "forge-image-worker", "forge-2d-map-worker", "forge-2d-character-worker"],
        "dispatchable": True, "priority": 1, "fallback": "local-qwen",
        "note": "Primary Free API flagship worker on 8082; falls back to local-qwen when rate-limited.",
    },
    {
        "id": "nvidia-glm", "name": "NVIDIA GLM Free", "kind": "nvidia",
        "endpoint": "http://127.0.0.1:8082/v1", "model": "z-ai/glm-5.3-flash",
        "skills": ["forge-worker", "forge-qa-worker", "forge-web-worker", "forge-unity-worker", "forge-blender-worker", "forge-image-worker", "forge-2d-map-worker", "forge-2d-character-worker"],
        "dispatchable": True, "priority": 1, "fallback": "local-qwen",
        "note": "Primary important-job worker; free NVIDIA bridge; stops when metered.",
    },
    {
        "id": "blender-local", "name": "Blender Tool Worker", "kind": "blender",
        "path": str(BLENDER), "model": "blender-bpy",
        "skills": ["forge-blender-worker"],
        "dispatchable": True, "priority": 2, "fallback": "opencode-deepseek",
        "note": "Headless Blender tool worker; red until a blender.exe is found.",
    },
    {
        "id": "qwen-image", "name": "Qwen-Image 2.1 (local GPU)", "kind": "image",
        "model": "qwen_image_2.1-Q4_K", "path": str(SD_CLI) if "SD_CLI" in globals() else "",
        "skills": ["forge-image-worker"],
        "dispatchable": False, "priority": 1, "fallback": "local-qwen",
        "note": "Local image engine. One render at a time; a second request queues instead of thrashing RAM.",
    },
    {
        "id": "opencode-beam", "name": "OpenCode Beam Free", "kind": "opencode",
        "model": "opencode/beam-free",
        "skills": ["forge-worker", "forge-web-worker", "forge-unity-worker", "forge-qa-worker", "forge-blender-worker", "forge-image-worker", "forge-2d-map-worker", "forge-2d-character-worker"],
        "dispatchable": True, "priority": 5, "fallback": "local-qwen",
        "note": "Free OpenCode worker; idle pool.",
    },
    {
        "id": "opencode-deepseek", "name": "OpenCode DeepSeek Free", "kind": "opencode",
        "model": "opencode/deepseek-v4.1-flash-free",
        "skills": ["forge-worker", "forge-web-worker", "forge-unity-worker", "forge-qa-worker", "forge-blender-worker", "forge-image-worker", "forge-2d-map-worker", "forge-2d-character-worker"],
        "dispatchable": True, "priority": 5, "fallback": "local-qwen",
        "note": "Free OpenCode worker; idle pool.",
    },
    {
        "id": "opencode-flint", "name": "OpenCode Flint 40B Free", "kind": "opencode",
        "model": "opencode/flint-40b-free",
        "skills": ["forge-worker", "forge-web-worker", "forge-unity-worker", "forge-qa-worker", "forge-blender-worker", "forge-image-worker", "forge-2d-map-worker", "forge-2d-character-worker"],
        "dispatchable": True, "priority": 5, "fallback": "local-qwen",
        "note": "Free OpenCode worker; idle pool.",
    },
    {
        "id": "opencode-glm", "name": "OpenCode GLM Free", "kind": "opencode",
        "model": "opencode/glm-5.3-flash-free",
        "skills": ["forge-worker", "forge-web-worker", "forge-unity-worker", "forge-qa-worker", "forge-blender-worker", "forge-image-worker", "forge-2d-map-worker", "forge-2d-character-worker"],
        "dispatchable": True, "priority": 5, "fallback": "local-qwen",
        "note": "Free OpenCode worker; idle pool.",
    },
    {
        "id": "opencode-mimo", "name": "OpenCode MiMo Free", "kind": "opencode",
        "model": "opencode/mimo-v2.6-flash-free",
        "skills": ["forge-worker", "forge-web-worker", "forge-unity-worker", "forge-qa-worker", "forge-blender-worker", "forge-image-worker", "forge-2d-map-worker", "forge-2d-character-worker"],
        "dispatchable": True, "priority": 5, "fallback": "local-qwen",
        "note": "Free OpenCode worker; idle pool.",
    },
    {
        "id": "opencode-minimax", "name": "OpenCode MiniMax Free", "kind": "opencode",
        "model": "opencode/minimax-m3.1-flash-free",
        "skills": ["forge-worker", "forge-web-worker", "forge-unity-worker", "forge-qa-worker", "forge-blender-worker", "forge-image-worker", "forge-2d-map-worker", "forge-2d-character-worker"],
        "dispatchable": True, "priority": 5, "fallback": "local-qwen",
        "note": "Free OpenCode worker; idle pool.",
    },
    {
        "id": "opencode-nemotron-ultra", "name": "OpenCode Nemotron Ultra Free", "kind": "opencode",
        "model": "opencode/nemotron-3-ultra-free",
        "skills": ["forge-worker", "forge-web-worker", "forge-unity-worker", "forge-qa-worker", "forge-blender-worker", "forge-image-worker", "forge-2d-map-worker", "forge-2d-character-worker"],
        "dispatchable": True, "priority": 5, "fallback": "local-qwen",
        "note": "Free OpenCode worker; idle pool.",
    },
    {
        "id": "opencode-nemotron-lightning", "name": "OpenCode Nemotron Lightning Free", "kind": "opencode",
        "model": "opencode/nemotron-3.5-lightning-free",
        "skills": ["forge-worker", "forge-web-worker", "forge-unity-worker", "forge-qa-worker", "forge-blender-worker", "forge-image-worker", "forge-2d-map-worker", "forge-2d-character-worker"],
        "dispatchable": True, "priority": 5, "fallback": "local-qwen",
        "note": "Free OpenCode worker; idle pool.",
    },
    {
        "id": "opencode-nemotron-vl", "name": "OpenCode Nemotron VL Free", "kind": "opencode",
        "model": "opencode/nemotron-3.5-super-vl-free",
        "skills": ["forge-worker", "forge-web-worker", "forge-unity-worker", "forge-qa-worker", "forge-blender-worker", "forge-image-worker", "forge-2d-map-worker", "forge-2d-character-worker"],
        "dispatchable": True, "priority": 5, "fallback": "local-qwen",
        "note": "Free OpenCode worker; idle pool.",
    },
    {
        "id": "triposr-local", "name": "TripoSR Image-to-3D", "kind": "tool",
        "path": str(PIPELINE / "triposr.py"), "model": "triposr",
        "skills": ["forge-image-to-3d", "forge-blender-worker"],
        "dispatchable": True, "priority": 3, "fallback": "",
        "capabilities": ["3d.image_to_mesh", "3d.base_mesh"],
        "note": "MIT TripoSR; CPU-first so the shared Gemma engine stays resident. Brief is JSON.",
    },
    {
        "id": "unity-build", "name": "Unity Player Build", "kind": "tool",
        "path": str(UNITY_CLI), "model": "unity-build",
        "skills": ["forge-unity-worker", "forge-release"],
        "dispatchable": True, "priority": 2, "fallback": "",
        "capabilities": ["unity.build.windows", "unity.build.webgl", "release.build"],
        "note": "unity build; brief is JSON with project/target/output_path. Player build, not tests.",
    },
    {
        "id": "audio-piper", "name": "Piper Audio Batch", "kind": "tool",
        "path": str(PIPELINE / "audio_batch.py"), "model": "piper+forge-synth",
        "skills": ["forge-audio-worker"],
        "dispatchable": True, "priority": 3, "fallback": "",
        "capabilities": ["audio.tts", "audio.sfx", "audio.validate"],
        "note": "Deterministic Piper TTS + synthesized SFX. Brief is JSON; no LLM fallback.",
    },
    {
        "id": "playtest-web", "name": "Forge Web Playtest", "kind": "tool",
        "path": str(PIPELINE / "playtest_web.mjs"), "model": "playwright",
        "skills": ["forge-playtest"],
        "dispatchable": True, "priority": 4, "fallback": "",
        "capabilities": ["qa.playtest.web", "qa.screenshot", "qa.fps"],
        "note": "Playwright capture; brief is JSON with url/out/wait/actions.",
    },
    {
        "id": "release-pack", "name": "Forge Release Packager", "kind": "tool",
        "path": str(PIPELINE / "release.py"), "model": "release-packager",
        "skills": ["forge-release"],
        "dispatchable": True, "priority": 5, "fallback": "",
        "capabilities": ["release.zip", "release.manifest", "release.credits"],
        "note": "Unsigned ZIP + SHA-256 manifest + credits/licence skeleton. Brief is JSON.",
    },
    {
        "id": "foundry-local", "name": "LYGO Asset Foundry", "kind": "tool",
        "path": str(FOUNDRY_FORGE), "model": "asset-foundry-qwen",
        "skills": ["forge-2d-character-worker", "forge-image-worker", "forge-2d-map-worker"],
        "dispatchable": True, "priority": 2, "fallback": "",
        "capabilities": ["asset.generate", "asset.cutout", "asset.validate"],
        "note": "Local Qwen Asset Foundry: magenta cutout, seed, validation, real PNG output.",
    },
    {
        "id": "pdhowler", "name": "PD Howler 11", "kind": "tool",
        "path": r"J:\SteamLibrary\steamapps\common\PD_Howler_11\dogwaffle.exe",
        "model": "pd-howler-11", "skills": ["forge-pdhowler-worker", "forge-image-worker", "forge-2d-character-worker"],
        "dispatchable": True, "priority": 3, "fallback": "opencode-deepseek",
        "capabilities": ["image.convert", "image.resize", "image.gradient"],
        "note": "ImageMagick convert adapter; GUI painting not automatable.",
    },
    {
        "id": "tyranobuilder", "name": "TyranoBuilder", "kind": "tool",
        "path": r"J:\SteamLibrary\steamapps\common\TyranoBuilder\TyranoBuilder.exe",
        "model": "tyranobuilder", "skills": ["forge-web-worker"],
        "dispatchable": False, "priority": 40, "fallback": "opencode-deepseek",
        "note": "Installed; visual-novel adapter pending. Orange standby.",
    },
    {
        "id": "rpgmaker-mv", "name": "RPG Maker MV", "kind": "tool",
        "path": r"J:\SteamLibrary\steamapps\common\RPG Maker MV\RPGMV.exe",
        "model": "rpg-maker-mv", "skills": ["forge-rpgmaker-worker", "forge-rpgmaker-author-worker", "forge-2d-map-worker", "forge-2d-character-worker"],
        "dispatchable": True, "priority": 4, "fallback": "opencode-deepseek",
        "capabilities": ["rpgmaker.project.validate", "rpgmaker.data.inspect", "rpgmaker.event.create", "rpgmaker.rollback"],
        "note": "Read-only RPG Maker MV project validator.",
    },
    {
        "id": "rpgmaker-vxace", "name": "RPG Maker VX Ace", "kind": "tool",
        "path": r"J:\SteamLibrary\steamapps\common\RPGVXAce\RPGVXAce.exe",
        "model": "rpg-maker-vxace", "skills": ["forge-2d-map-worker", "forge-2d-character-worker"],
        "dispatchable": False, "priority": 40, "fallback": "opencode-deepseek",
        "note": "Installed; RPG Maker VX Ace adapter pending. Orange standby.",
    },
    {
        "id": "rytmik-studio", "name": "Rytmik Studio", "kind": "tool",
        "path": r"J:\SteamLibrary\steamapps\common\Rytmik Studio\RS.exe",
        "model": "rytmik-studio", "skills": ["forge-audio-worker"],
        "dispatchable": False, "priority": 40, "fallback": "opencode-deepseek",
        "note": "Installed; music/SFX adapter pending. Orange standby.",
    },
    {
        "id": "rytmik-ultimate", "name": "Rytmik Ultimate", "kind": "tool",
        "path": r"J:\SteamLibrary\steamapps\common\Rytmik Ultimate\RU.exe",
        "model": "rytmik-ultimate", "skills": ["forge-audio-worker"],
        "dispatchable": False, "priority": 40, "fallback": "opencode-deepseek",
        "note": "Installed; music/SFX adapter pending. Orange standby.",
    },
    {
        "id": "unity-test", "name": "Unity Test Runner", "kind": "unity",
        "path": str(UNITY_CLI), "model": "unity-cli-6000.5.9f1",
        "skills": ["forge-qa-worker"],
        "dispatchable": True, "priority": 4, "fallback": "",
        "capabilities": ["unity.test.editmode", "unity.test.playmode"],
        "note": "Read-only Unity EditMode test runner; real CLI evidence.",
    },
    {
        "id": "local-qwen", "name": "LYGO Engine", "kind": "local",
        "endpoint": "http://127.0.0.1:8081/v1", "model": "Qwen3-4B-Instruct-2507",
        "skills": ["forge-worker", "forge-qa-worker", "forge-web-worker", "forge-2d-map-worker"],
        "dispatchable": True, "priority": 60, "fallback": "",
        "note": "Shared local engine (llama-server on 8080, Bearer local). The old 8081 gemma bridge is retired.",
    },
    {
        "id": "stream-shared", "name": "Stream PC / Shared Worker", "kind": "shared",
        "model": "stream-4b", "skills": ["forge-worker", "forge-qa-worker"],
        "dispatchable": True, "priority": 30, "fallback": "local-qwen",
        "note": "Linked through <DRIVE_D>\LYGO_SHARED.",
    },
    {
        "id": "chatrtx-ui", "name": "NVIDIA ChatRTX", "kind": "ui",
        "model": "chatrtx-0.5", "skills": [], "dispatchable": False,
        "priority": 99, "fallback": "",
        "note": "ABANDONED: UI-only; no local API server installed.",
    },
    {
        "id": "gemini-3-flash", "name": "Gemini 3 Flash", "kind": "gemini",
        "model": "gemini-3-flash-preview",
        "skills": ["forge-worker", "forge-web-worker", "forge-qa-worker", "forge-2d-map-worker",
                   "forge-ui-worker", "forge-image-worker", "forge-2d-character-worker"],
        "dispatchable": True, "priority": 2, "fallback": "opencode-deepseek",
        "note": "Google Gemini 3 Flash via REST. Verified 2026-10-27. Long context, strong vision.",
    },
    {
        "id": "gemini-flash-lite", "name": "Gemini 3.1 Flash-Lite", "kind": "gemini",
        "model": "gemini-3.1-flash-lite",
        "skills": ["forge-worker", "forge-web-worker", "forge-qa-worker"],
        "dispatchable": True, "priority": 3, "fallback": "gemini-3-flash",
        "note": "Cheapest Gemini route; verified 2026-10-27. Small repetitive passes.",
    },
    {
        "id": "gemini-3-pro", "name": "Gemini 3.1 Pro", "kind": "gemini",
        "model": "gemini-3.1-pro-preview",
        "skills": ["forge-master", "forge-worker", "forge-qa-worker"],
        "dispatchable": True, "priority": 7, "fallback": "gemini-3-flash",
        "note": "QUOTA-LIMITED on the free key (429 on 2026-10-27). gemini-2.5-flash is 404 for new "
                "users - never select it.",
    },
]

SKILL_ALIASES = {
    "blender": "forge-blender-worker",
    "image": "forge-image-worker",
    "2d-map": "forge-2d-map-worker",
    "map": "forge-2d-map-worker",
    "2d-character": "forge-2d-character-worker",
    "character": "forge-2d-character-worker",
    "unity": "forge-unity-worker",
    "web": "forge-web-worker",
    "qa": "forge-qa-worker",
    "worker": "forge-worker",
    "master": "forge-master",
}


def _write(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8-sig")


def _read(path: Path, fallback):
    try:
        return json.loads(path.read_text(encoding="utf-8-sig"))
    except Exception:
        return fallback


def _now() -> float:
    return time.time()


def normalize_skill(value: str) -> str:
    v = (value or "").strip()
    return SKILL_ALIASES.get(v, v if v.startswith("forge-") else "forge-worker")


def load_agents() -> list[dict]:
    with LOCK:
        data = _read(AGENTS_FILE, {})
        agents = data.get("agents", []) if isinstance(data, dict) else []
        by_id = {a.get("id"): a for a in agents if isinstance(a, dict)}
        for default in AGENT_DEFAULTS:
            if default["id"] not in by_id:
                by_id[default["id"]] = json.loads(json.dumps(default))
            elif default["id"] in ("triposr-local", "playtest-web", "release-pack", "audio-piper"):
                # Older builds saved the PyInstaller _MEI temp path; replace it
                # with the stable install path so tools survive rebuilds.
                by_id[default["id"]]["path"] = default["path"]
            else:
                existing = by_id[default["id"]]
                # The policy fields are authoritative; status/stats/current are preserved.
                for key in ("name", "kind", "model", "endpoint", "path", "skills", "dispatchable", "priority", "fallback", "note", "capabilities"):
                    if key in default:
                        existing[key] = default[key]
                existing["policy"] = "0.3"
        out = []
        for a in by_id.values():
            a.setdefault("status", "unknown")
            a.setdefault("last_seen", 0)
            a.setdefault("current_job", None)
            a.setdefault("stats", {"done": 0, "failed": 0, "total_seconds": 0, "last_result": ""})
            out.append(a)
        return sorted(out, key=lambda a: (a.get("priority", 50), a.get("name", "")))


def save_agents(agents: list[dict]) -> None:
    with LOCK:
        _write(AGENTS_FILE, {"agents": agents, "updated": _now()})


def load_jobs() -> list[dict]:
    with LOCK:
        data = _read(JOBS_FILE, {})
        return data.get("jobs", []) if isinstance(data, dict) else []


def save_jobs(jobs: list[dict]) -> None:
    with LOCK:
        _write(JOBS_FILE, {"jobs": jobs, "updated": _now()})


def get_agent(agent_id: str) -> dict | None:
    return next((a for a in load_agents() if a["id"] == agent_id), None)


def _http_models(endpoint: str) -> bool:
    try:
        req = urllib.request.Request(endpoint.rstrip("/") + "/models", headers={"Authorization": "Bearer local"})
        with urllib.request.urlopen(req, timeout=3) as r:
            return r.status == 200
    except Exception:
        return False


def _process_exists(pattern: str) -> bool:
    try:
        out = subprocess.run(["powershell.exe", "-NoProfile", "-Command",
                              f"Get-Process | Where-Object {{ $_.ProcessName -match '{pattern}' }} | Select-Object -First 1 -ExpandProperty Id"],
                             capture_output=True, text=True, timeout=8).stdout.strip()
        return bool(out)
    except Exception:
        return False


def probe_agent(agent: dict) -> dict:
    kind = agent.get("kind")
    status = "offline"
    detail = ""
    if kind == "nvidia":
        ok = _http_models(agent.get("endpoint", ""))
        status = "ready" if ok else "offline"
        detail = "NVIDIA free endpoint — primary worker" if ok else "NVIDIA bridge offline; needs boot"
    elif kind == "local":
        ok = _http_models(agent.get("endpoint", ""))
        status = "ready" if ok else "offline"
        detail = "Shared LYGO engine ready" if ok else "shared engine offline; needs boot"
    elif kind == "unity":
        ok = UNITY_CLI.exists()
        status = "ready" if ok else "offline"
        detail = "Unity CLI test runner ready" if ok else "Unity CLI missing"
    elif kind == "gemini":
        has_key = bool(_gemini_key())
        status = "ready" if has_key else "offline"
        detail = ("Gemini CLI worker ready (%s)" % agent.get("model")
                  if has_key else "no Gemini key in api.json; add keys.gemini")
    elif kind == "opencode":
        ok = OPENCODE.exists()
        blocked = OPENCODE_QUOTA_FILE.exists()
        if blocked:
            status = "offline"
            detail = "OpenCode free quota reached; OpenCode Go required (reset endpoint available)"
        else:
            status = "ready" if ok else "offline"
            detail = "OpenCode CLI available" if ok else "OpenCode CLI missing"
    elif kind == "master":
        ok = HERMES.exists()
        status = "ready" if ok else "offline"
        detail = "Hermes installed; deterministic board active" if ok else "Hermes not found"
    elif kind == "shared":
        ok = SHARED_ROOT.exists() and SHARED_CLI.exists()
        status = "ready" if ok else "offline"
        detail = "Stream PC shared worker linked" if ok else "Stream bus unavailable"
    elif kind == "blender":
        path = agent.get("path") or str(BLENDER) or os.environ.get("LYGO_BLENDER", "")
        ok = bool(path) and Path(path).exists()
        status = "ready" if ok else "offline"
        detail = "Blender executable found: " + path if ok else "Blender executable not found; RED — install or set LYGO_BLENDER"
    elif kind == "image":
        st = image_state()
        status = "ready"
        status = "ready" if st.get("state") == "idle" else ("busy" if st.get("state") == "running" else st.get("state", "ready"))
        detail = st.get("detail") or "Qwen-Image 2.1 idle"
    elif kind == "tool":
        tool_id = agent.get("id", "")
        path = agent.get("path", "")
        installed = bool(path) and Path(path).exists()
        if tool_id == "unity-build":
            ready = UNITY_CLI.exists()
            status = "ready" if ready else "offline"
            detail = "Unity CLI build ready" if ready else "Unity CLI missing"
        elif tool_id == "triposr-local":
            ready = (PIPELINE / "triposr.py").exists() and (FORGE_INSTALL / "tools" / "TripoSR" / "weights" / "model.ckpt").exists()
            status = "ready" if ready else "offline"
            detail = "TripoSR CPU/GPU image-to-3D ready" if ready else "TripoSR weights/wrapper missing"
        elif tool_id == "audio-piper":
            ready = (PIPELINE / "audio_batch.py").exists() and PIPER_BIN.exists()
            status = "ready" if ready else "offline"
            detail = "Piper TTS + synth SFX batch ready" if ready else "audio_batch.py or Piper missing"
        elif tool_id == "playtest-web":
            ready = (PIPELINE / "playtest_web.mjs").exists()
            status = "ready" if ready else "offline"
            detail = "Web playtest capture ready" if ready else "playtest_web.mjs missing"
        elif tool_id == "release-pack":
            ready = (PIPELINE / "release.py").exists()
            status = "ready" if ready else "offline"
            detail = "Release packager ready" if ready else "release.py missing"
        elif tool_id == "foundry-local":
            ready = FOUNDRY_FORGE.exists() and FOUNDRY_PY.exists()
            status = "ready" if ready else "offline"
            detail = "Asset Foundry ready" if ready else "Foundry path missing"
        elif tool_id == "pdhowler":
            ready = installed and PDHOWLER_CONVERT.exists()
            status = "ready" if ready else "offline"
            detail = "ImageMagick convert adapter ready; painting is GUI-only" if ready else "PD Howler convert.exe missing"
        elif tool_id == "rpgmaker-mv":
            ready = installed and (RPGMAKER_PROJECT / "data").is_dir()
            status = "ready" if ready else "offline"
            detail = "RPG Maker MV project validator ready (read-only)" if ready else "RPG Maker MV project data missing"
        else:
            status = "standby" if installed else "offline"
            detail = "Installed; no supported headless adapter — blocked" if installed else "tool path missing"
    elif kind == "ui":
        status = "offline"
        detail = "ABANDONED: UI-only; no local API server installed"
    agent["status"] = status
    agent["detail"] = detail
    agent["last_seen"] = _now() if status in ("ready", "standby", "busy", "ui-only") else agent.get("last_seen", 0)
    return agent


def refresh_agents() -> list[dict]:
    agents = [probe_agent(a) for a in load_agents()]
    working = {j.get("agent") for j in load_jobs() if j.get("status") == "working"}
    for agent in agents:
        if agent.get("current_job") and agent.get("id") in working:
            agent["status"] = "busy"
            agent["detail"] = "working on " + str(agent.get("current_job"))
    save_agents(agents)
    return agents


def skill_text(skill: str) -> str:
    path = SKILLS_DIR / normalize_skill(skill) / "SKILL.md"
    if path.exists():
        return path.read_text(encoding="utf-8")
    return f"# {skill}\n\nNo skill document found. Keep changes inside the job and return evidence.\n"


def _job_prompt(job: dict, skill: str) -> str:
    parts = [
        f"FORGE WORKER JOB {job['id']}",
        f"Skill: {skill}",
        f"Project: {job.get('project')}",
        f"Project path: {job.get('project_path')}",
        f"Title: {job.get('title')}",
        f"Brief: {job.get('brief')}",
        "",
    ]
    if job.get("role"):
        parts.append("ROLE / STAGE:\n" + __import__("production_workflow").role_brief(job.get("role", ""), job.get("stage", "")))
        parts.append("")
    parts += [
        "You are a specialist Forge worker. Follow the assigned skill exactly.",
        "Only work on this job. Do not add features or change unrelated files.",
        "Do not publish, push, deploy, or buy anything.",
        "Return a concise RESULT, the files changed, and the evidence you ran.",
        "",
    ]
    if job.get("context"):
        parts += ["PROJECT CONTEXT:", job["context"], ""]
    parts += ["SKILL:", skill_text(skill)]
    return "\n".join(parts)


def _gemini_key() -> str:
    """The Gemini key: env first, then the console's api.json. Never logged."""
    for name in ("GEMINI_API_KEY", "GOOGLE_API_KEY"):
        v = os.environ.get(name)
        if v:
            return v
    try:
        cfg = json.loads(LYGO_API_JSON.read_text(encoding="utf-8"))
        return str((cfg.get("keys") or {}).get("gemini") or "")
    except Exception:
        return ""


def _run_gemini(agent: dict, job: dict) -> str:
    """One Gemini turn through the CLI, so the worker can WRITE FILES.

    A REST completion only returns text - measured 2026-10-27: the job came back in 6 s and created
    nothing. The CLI with `-y` edits the project like OpenCode does. Model note: this key 404s on
    gemini-2.5-flash ("no longer available to new users") and 429s on pro; the flash-3 models work.
    """
    key = _gemini_key()
    if not key:
        raise RuntimeError("no Gemini API key (set GEMINI_API_KEY or keys.gemini in api.json)")
    if not GEMINI_BIN.exists():
        raise RuntimeError(f"gemini CLI not found at {GEMINI_BIN}")
    model = str(agent.get("model") or "gemini-3-flash-preview")
    full_prompt = _job_prompt(job, job.get("skill") or "forge-worker")
    brief_path = _brief_file(job, full_prompt)
    prompt = f"Read {brief_path} and execute the brief. Write the real files it asks for."
    # Launch the npm .cmd shim through cmd /c. Measured 2026-10-28: Popen("gemini.cmd", ...) with
    # piped stdio never returns (same instruction bare: 5.8s; via cmd /c: 6.7s).
    cmd = ["cmd", "/c", str(GEMINI_BIN), "-p", prompt, "-m", model, "-y", "-o", "text"]
    env = os.environ.copy()
    env["GEMINI_API_KEY"] = key
    env.pop("ELECTRON_RUN_AS_NODE", None)
    timeout = int(os.environ.get("LYGO_GEMINI_TIMEOUT", "3600"))
    proc = subprocess.Popen(cmd, cwd=job.get("project_path") or str(PROJECTS_ROOT), env=env,
                            stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
                            encoding="utf-8", errors="replace")
    _reg_pid(job["id"], proc.pid)
    try:
        raw, err = _stream_proc(proc, job["id"], timeout)
    except subprocess.TimeoutExpired:
        proc.kill()
        proc.communicate()
        raise RuntimeError(f"Gemini worker timed out after {timeout}s")
    blob = (raw or "") + "\n" + (err or "")
    if "429" in blob or "quota" in blob.lower() and "exceeded" in blob.lower():
        raise RuntimeError(f"Gemini quota exceeded for {model}")
    if "no longer available to new users" in blob:
        raise RuntimeError(f"Gemini model {model} is unavailable to this key - use a gemini-3 model")
    text = "\n".join(
        line for line in (raw or "").splitlines()
        if not line.startswith("Warning: 256-color") and not line.startswith("Ripgrep is not available")
    ).strip()
    if not text:
        raise RuntimeError("Gemini worker returned nothing: " + (err or "")[:200])
    return text


LAST_OUTPUT: dict = {}
OUTPUT_LINES: dict = {}


def _brief_file(job: dict, text: str) -> Path:
    """Write the full brief INSIDE the project so the worker is allowed to read it.

    Measured 2026-10-28: writing it under forge/data/jobs made Gemini refuse with
    "Path not in workspace" - its read tool is sandboxed to the project cwd.
    """
    base = Path(job.get("project_path") or DATA_HOME)
    d = base / ".forge-briefs"
    try:
        d.mkdir(parents=True, exist_ok=True)
    except Exception:
        d = DATA_HOME / "jobs"
        d.mkdir(parents=True, exist_ok=True)
    p = d / f"{job['id']}.brief.md"
    p.write_text(text, encoding="utf-8")
    return p


def _stream_proc(proc, job_id: str, timeout: int) -> tuple[str, str]:
    """Read the worker's stdout/stderr line by line and record a heartbeat.

    The heartbeat (LAST_OUTPUT) is the only honest liveness signal for an LLM worker: CPU sits at zero
    while it waits for tokens, so CPU-based watchdogs kill healthy work.
    """
    import threading

    out_lines: list[str] = []
    err_lines: list[str] = []

    def pump(stream, sink):
        try:
            for line in iter(stream.readline, ""):
                sink.append(line)
                LAST_OUTPUT[job_id] = time.time()
                buf = OUTPUT_LINES.setdefault(job_id, [])
                buf.append(line.rstrip()[:400])
                if len(buf) > 500:
                    del buf[:-500]
        except Exception:
            pass

    LAST_OUTPUT[job_id] = time.time()
    t1 = threading.Thread(target=pump, args=(proc.stdout, out_lines), daemon=True)
    t2 = threading.Thread(target=pump, args=(proc.stderr, err_lines), daemon=True)
    t1.start()
    t2.start()
    try:
        proc.wait(timeout=timeout)
    except Exception:
        proc.kill()
        try:
            proc.wait(timeout=10)
        except Exception:
            pass
        raise RuntimeError(f"worker timed out after {timeout}s")
    t1.join(3)
    t2.join(3)
    return "".join(out_lines), "".join(err_lines)


JSON_WRITE_CONTRACT = """

Return ONLY a JSON object, no prose and no markdown fence:

{"summary": "one line on what you did",
 "files": [{"path": "relative/path.ext", "content": "the complete file contents"}],
 "commands": ["optional shell commands the operator may run"]}

Rules:
- paths are relative to the project root; never absolute, never containing ".."
- write real, complete file contents - no placeholders, no "..." elisions
- text files only (md, js, css, html, json, py, txt). Binary art must be described in `commands`
  (an image/asset command) rather than invented as bytes
- if the task is impossible, return {"summary": "...", "files": [], "commands": [], "blocked": "why"}
"""


def _extract_json(text: str) -> dict:
    import json as _json
    import re as _re

    if not text:
        return {}
    fenced = _re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, _re.S)
    candidate = fenced.group(1) if fenced else None
    if candidate is None:
        start = text.find("{")
        if start == -1:
            return {}
        depth = 0
        for i in range(start, len(text)):
            if text[i] == "{":
                depth += 1
            elif text[i] == "}":
                depth -= 1
                if depth == 0:
                    candidate = text[start:i + 1]
                    break
    try:
        return _json.loads(candidate) if candidate else {}
    except Exception:
        return {}


def _vault_reject(project: Path, dest: Path, text: str, reason: str) -> None:
    """Keep a rejected (stub-like) attempt in the vault so the attempt is auditable, file untouched."""
    import os as _os, time as _t
    try:
        root = Path(_os.environ.get("LYGO_VAULT_ROOT",
                    r"<EDRIVE>\LYGO GAMES AND WEBPAGES")) / project.name / "SUBMISSIONS"
        stamp = _t.strftime("%Y%m%d-%H%M%S")
        d = root / (stamp + "_rejected_" + dest.name)
        d.mkdir(parents=True, exist_ok=True)
        (d / dest.name).write_text(text, encoding="utf-8")
        (d / "REASON.txt").write_text(reason + "\n", encoding="utf-8")
    except Exception:
        pass


def _vault_old_copy(project: Path, path: Path, task: str = "whole-file-rewrite") -> None:
    """Append the current version of a file to the mirror vault before the writer replaces it."""
    import subprocess as _sp, sys as _sys
    try:
        tool = project / "tools" / "vault.py"
        if tool.exists():
            _sp.run([_sys.executable, str(tool), "backup", str(project), "--task", task,
                     "--agent", "forge-writer", "--paths", str(path)],
                    capture_output=True, timeout=180)
    except Exception:
        pass


def _syntax_ok(path: Path) -> tuple[bool, str]:
    """Cheap syntax gate for the files agents touch. Returns (ok, reason)."""
    import subprocess as _sp
    suffix = path.suffix.lower()
    try:
        if suffix == ".js" or suffix == ".mjs":
            r = _sp.run(["node", "--check", str(path)], capture_output=True, text=True, timeout=60)
            if r.returncode != 0:
                return False, (r.stderr or r.stdout or "node --check failed").strip().splitlines()[0][:200]
            # node --check does NOT catch duplicate top-level declarations, which is exactly how a
            # model broke audio.js (two `SAMPLE_MAP` consts). Scan for repeated module-scope names.
            import re as _re, collections as _c
            text = path.read_text(encoding="utf-8", errors="replace")
            decls = _re.findall(
                r"^(?:export\s+)?(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)", text, _re.M)
            dupes = [n for n, k in _c.Counter(decls).items() if k > 1]
            if dupes:
                return False, "duplicate top-level declaration: " + ", ".join(sorted(dupes)[:4])
        elif suffix == ".py":
            r = _sp.run([_sys_executable(), "-m", "py_compile", str(path)],
                        capture_output=True, text=True, timeout=60)
            if r.returncode != 0:
                return False, (r.stderr or "py_compile failed").strip().splitlines()[-1][:200]
        elif suffix == ".json":
            import json as _json
            _json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        return False, type(exc).__name__ + ": " + str(exc)[:160]
    return True, ""


def _sys_executable() -> str:
    import sys as _s
    return _s.executable


def _revert_from_backup(dest: Path, stamp: str) -> bool:
    """Restore the newest .bak-<stamp> the writer made for this file."""
    for cand in sorted(dest.parent.glob(dest.name + ".bak-*"), key=lambda x: x.stat().st_mtime, reverse=True):
        try:
            shutil.copy2(cand, dest)
            return True
        except Exception:
            continue
    return False


def _write_files(project: Path, files: list, edits: list | None = None) -> tuple[list[str], list[str]]:
    written, skipped = [], []
    root = project.resolve()
    import time as _t
    stamp = _t.strftime("%Y%m%d-%H%M%S")

    # 1. Surgical search-and-replace edits on existing files
    for item in edits or []:
        if not isinstance(item, dict):
            continue
        rel = str(item.get("path") or "").strip().replace("\\", "/").lstrip("./")
        if rel.startswith("rel/"):
            rel = rel[4:]
        old_s = item.get("old")
        new_s = item.get("new")
        if not rel or old_s is None or new_s is None:
            continue
        if rel.startswith("/") or ".." in rel.split("/"):
            skipped.append(rel + " (unsafe path)")
            continue
        dest = (root / rel).resolve()
        if root not in dest.parents and dest != root:
            skipped.append(rel + " (outside project)")
            continue
        if not dest.is_file():
            skipped.append(rel + " (edit target does not exist)")
            continue
        try:
            cur = dest.read_text(encoding="utf-8", errors="replace")
            if str(old_s) not in cur:
                skipped.append(rel + " (edit old snippet not found)")
                continue
            shutil.copy2(dest, dest.with_suffix(dest.suffix + f".bak-{stamp}"))
            updated = cur.replace(str(old_s), str(new_s), 1)
            dest.write_text(updated, encoding="utf-8")
            ok, why = _syntax_ok(dest)
            if not ok:
                dest.write_text(cur, encoding="utf-8")
                _vault_reject(project, dest, updated, "syntax gate (edit): " + why)
                skipped.append(f"{rel} (REJECTED edit syntax: {why}; original restored)")
                continue
            if rel not in written:
                written.append(rel)
        except Exception as exc:
            skipped.append(f"{rel} ({type(exc).__name__})")

    # 2. Full file writes (previous version vaulted before any shrink)
    for item in files or []:
        if not isinstance(item, dict):
            continue
        rel = str(item.get("path") or "").strip().replace("\\", "/").lstrip("./")
        if rel.startswith("rel/"):
            rel = rel[4:]
        content = item.get("content")
        if not rel or content is None:
            continue
        if rel.startswith("/") or ".." in rel.split("/"):
            skipped.append(rel + " (unsafe path)")
            continue
        dest = (root / rel).resolve()
        if root not in dest.parents and dest != root:
            skipped.append(rel + " (outside project)")
            continue
        try:
            dest.parent.mkdir(parents=True, exist_ok=True)
            new_text = str(content)
            new_bytes = len(new_text.encode("utf-8"))
            if dest.exists():
                old_bytes = dest.stat().st_size
                # Hard shrink guard: never let a stateless writer replace a >3.5KB file with a small stub
                if old_bytes > 3500 and new_bytes < old_bytes * 0.65 and not item.get("allow_shrink"):
                    if dest.suffix.lower() == ".md" and new_bytes >= 80:
                        # For markdown docs (TECH_SPEC.md, QA.md, GDD.md, BUILD.md), workers emit the new
                        # section rather than repeating a 19 KB doc. Back up and append non-destructively.
                        old_text = dest.read_text(encoding="utf-8", errors="replace")
                        if new_text.strip()[-160:] not in old_text:
                            shutil.copy2(dest, dest.with_suffix(dest.suffix + f".bak-{stamp}"))
                            merged = old_text.rstrip() + "\n\n---\n\n" + new_text.strip() + "\n"
                            dest.write_text(merged, encoding="utf-8")
                            if rel not in written:
                                written.append(rel)
                            continue
                    # Whole-file replacement is allowed now: the previous version is appended to the
                    # mirror vault first, so a bad rewrite is always recoverable.
                    # Stub gate: a rewrite that collapses the file is not a change, it is a loss.
                    # Keep the file as it is, park the attempt in the vault, and let the agent retry.
                    _vault_reject(project, dest, new_text,
                                  f"stub gate: {old_bytes}B -> {new_bytes}B ({rel})")
                    skipped.append(
                        f"{rel} (REJECTED stub {old_bytes}B -> {new_bytes}B; file kept, attempt vaulted)"
                    )
                    continue
                shutil.copy2(dest, dest.with_suffix(dest.suffix + f".bak-{stamp}"))
            dest.write_text(new_text, encoding="utf-8")
            ok, why = _syntax_ok(dest)
            if not ok:
                # Rail: a file that does not parse is not a change, it is a broken game.
                restored = _revert_from_backup(dest, stamp)
                _vault_reject(project, dest, new_text, "syntax gate: " + why)
                skipped.append(f"{rel} (REJECTED syntax: {why}; "
                               + ("reverted from backup)" if restored else "no backup to revert)"))
                continue
            if rel not in written:
                written.append(rel)
        except Exception as exc:
            skipped.append(f"{rel} ({type(exc).__name__})")
    return written, skipped


def _http_chat(base: str, model: str, prompt: str, timeout: int = 600, system: str = "", max_tokens: int = 8000) -> str:
    """One chat completion against a local OpenAI-shaped bridge (8081 engine / 8082 NVIDIA)."""
    import urllib.request as _ur

    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})
    body = json.dumps({
        "model": model,
        "messages": messages,
        "temperature": 0.2,
        "max_tokens": max_tokens,
        "stream": False,
    }).encode("utf-8")
    req = _ur.Request(f"{base.rstrip('/')}/chat/completions", data=body,
                      headers={"Content-Type": "application/json"})
    with _ur.urlopen(req, timeout=timeout) as r:
        data = json.loads(r.read().decode("utf-8", "replace"))
    msg = ((data.get("choices") or [{}])[0].get("message") or {})
    out = (msg.get("content") or msg.get("reasoning_content") or "").strip()
    if "<think>" in out and "</think>" in out:
        out = out.split("</think>", 1)[-1].strip()
    return out


def _gather_project_context(project: Path, text: str, max_total: int = 3500) -> str:
    """Read existing project files mentioned in the task scope/acceptance so API writers never edit blind."""
    if not project.is_dir():
        return ""
    # Strip standard task boilerplate ("Read BUILD.md first...") so we only pull files relevant to THIS task
    core_text = text.split("Read BUILD.md first.")[0]
    candidates: list[str] = []
    for m in re.findall(r"(?:src|assets|docs)/[A-Za-z0-9_./-]+\.[A-Za-z0-9]+|[A-Z_]+\.(?:md|json)|index\.html", core_text):
        rel = m.strip(".,;:()[]{}\"'`")
        if rel not in candidates:
            candidates.append(rel)
    chunks: list[str] = []
    used = 0
    for rel in candidates[:4]:
        p = (project / rel).resolve()
        if not p.is_file() or project.resolve() not in p.parents:
            continue
        try:
            raw = p.read_text(encoding="utf-8", errors="replace")
        except OSError:
            continue
        size = len(raw.encode("utf-8"))
        if len(raw) > 2400:
            snippet = raw[:1400] + f"\n/* ... [{len(raw) - 2200} chars omitted; use edits[] on this {size}B file] ... */\n" + raw[-800:]
        else:
            snippet = raw
        block = f"--- EXISTING FILE: {rel} ({size} bytes) ---\n{snippet}\n"
        if used + len(block) > max_total:
            break
        chunks.append(block)
        used += len(block)
    return ("\nEXISTING PROJECT FILES (use `edits` for files > 3500 bytes; never replace a large file with a stub):\n"
            + "\n".join(chunks)) if chunks else ""


IMAGE_LOCK = DATA_HOME / "image-render.lock"
IMAGE_STATUS = DATA_HOME / "image-engine.json"


def image_state() -> dict:
    """Live state of the local Qwen-Image engine: idle / queued / running."""
    st = {"state": "idle", "pid": None, "elapsed": 0, "queued": 0, "detail": "Qwen-Image 2.1 idle"}
    try:
        if IMAGE_STATUS.exists():
            st.update(json.loads(IMAGE_STATUS.read_text(encoding="utf-8")))
    except Exception:
        pass
    if IMAGE_LOCK.exists():
        try:
            info = json.loads(IMAGE_LOCK.read_text(encoding="utf-8"))
            st["state"] = "running"
            st["pid"] = info.get("pid")
            st["elapsed"] = int(time.time() - float(info.get("at", time.time())))
            st["detail"] = f"Qwen-Image 2.1 rendering ({st['elapsed']}s, pid {st['pid']}) - one render at a time"
        except Exception:
            st["state"] = "running"
    return st


def _image_status_write(**kw) -> None:
    try:
        IMAGE_STATUS.write_text(json.dumps(kw, ensure_ascii=False), encoding="utf-8")
    except Exception:
        pass


def _acquire_image_lock(timeout: int = 1800) -> None:
    """One render at a time. A second request waits its turn instead of thrashing RAM."""
    started = time.time()
    while True:
        try:
            fd = os.open(str(IMAGE_LOCK), os.O_CREAT | os.O_EXCL | os.O_WRONLY)
            os.write(fd, json.dumps({"pid": os.getpid(), "at": time.time()}).encode())
            os.close(fd)
            return
        except FileExistsError:
            try:
                info = json.loads(IMAGE_LOCK.read_text(encoding="utf-8"))
                if time.time() - float(info.get("at", 0)) > 2400:
                    IMAGE_LOCK.unlink(missing_ok=True)
                    continue
            except Exception:
                pass
            waited = int(time.time() - started)
            _image_status_write(state="queued", waited=waited,
                                detail=f"queued behind another render ({waited}s)")
            if time.time() - started > timeout:
                raise RuntimeError("image engine busy for %ds; queue timed out" % timeout)
            time.sleep(5)


def _release_image_lock() -> None:
    try:
        IMAGE_LOCK.unlink(missing_ok=True)
    except Exception:
        pass
    _image_status_write(state="idle", detail="Qwen-Image 2.1 idle",
                        at=time.strftime("%Y-%m-%dT%H:%M:%S"))



def _looks_like_image_task(job: dict) -> bool:
    blob = (str(job.get("title") or "") + " " + str(job.get("brief") or "") + " " + str(job.get("task") or "")).lower()
    keys = ("1200x630", "1200 x 630", "plate", "key art", "og image", "sprite", "tileset", "icon set",
            ".png", ".jpg", ".jpeg", ".webp", "art bible plate", "portrait")
    return any(k in blob for k in keys)


def _run_image_writer(project: Path, job: dict) -> str:
    """Generate a real image asset locally (Qwen-Image), one render at a time."""
    import subprocess, re
    from PIL import Image
    _acquire_image_lock()
    _image_status_write(state="running", pid=os.getpid(), started=time.time(),
                        task=str(job.get("task") or ""),
                        detail="Qwen-Image 2.1 rendering - one render at a time")
    blob = str(job.get("title") or "") + "\n" + str(job.get("brief") or "")
    m = re.search(r"(\d{3,4})\s*[x×]\s*(\d{3,4})", blob)
    w, h = (int(m.group(1)), int(m.group(2))) if m else (1200, 630)
    slug = re.sub(r"[^a-z0-9]+", "-", str(job.get("task") or job.get("title") or "asset").lower()).strip("-")[:40] or "asset"
    outdir = project / "assets"
    outdir.mkdir(parents=True, exist_ok=True)
    raw = outdir / (slug + "-src.png")
    final = outdir / (slug + ".jpg")
    gen = os.environ.get("LYGO_IMAGE_GEN",
                         r"<USER>\Documents\deepseek-harness\default-workspace\tools\generate_image.ps1")
    prompt = ("Cinematic game key art, dark military sci-fi, gunmetal and amber, dramatic rim light, "
              + str(job.get("title") or "") + ". " + str(job.get("brief") or ""))[:700]
    subprocess.run(["pwsh", "-NoProfile", "-File", gen, "-Prompt", prompt, "-Width", str(w),
                    "-Height", str(h), "-Steps", "22", "-Seed", "8801", "-Output", str(raw)],
                   check=True, timeout=1500)
    img = Image.open(raw).convert("RGB")
    target = w / h
    cw, ch = img.size
    if cw / ch > target:
        nw = int(ch * target); box = ((cw - nw) // 2, 0, (cw - nw) // 2 + nw, ch)
    else:
        nh = int(cw / target); box = (0, (ch - nh) // 2, cw, (ch - nh) // 2 + nh)
    img.crop(box).resize((w, h), Image.LANCZOS).save(final, "JPEG", quality=88, optimize=True, progressive=True)
    try:
        raw.unlink()
    except OSError:
        pass
    size = final.stat().st_size
    if size > 250 * 1024:
        img = Image.open(final)
        img.save(final, "JPEG", quality=76, optimize=True, progressive=True)
        size = final.stat().st_size
    _release_image_lock()
    _image_status_write(state="idle", detail="Qwen-Image 2.1 idle", last=str(final.name),
                        at=time.strftime("%Y-%m-%dT%H:%M:%S"))
    return ("SUMMARY: generated " + str(w) + "x" + str(h) + " image locally [via Qwen-Image]\n"
            "FILES CHANGED:\n- assets/" + final.name + " (" + str(size) + " bytes)")

def _run_api_writer(agent: dict, job: dict) -> str:
    """An API worker that can actually change the project, via a JSON file/edit contract.

    Tries the assigned Free API (8082 NVIDIA) first with a fast 25s timeout; if it rate-limits (429)
    or hangs, automatically cools down 8082 and falls back to the shared Local Engine (8081 -> 11441)
    so the job completes in seconds without stalling.
    """
    kind = str(agent.get("kind") or "")
    primary_base = "http://127.0.0.1:8082/v1" if kind in ("nvidia", "master") else str(agent.get("endpoint") or "http://127.0.0.1:8081/v1")
    primary_model = str(agent.get("model") or "Qwen3-4B-Instruct-2507")
    project = Path(job.get("project_path") or PROJECTS_ROOT)
    if _looks_like_image_task(job):
        return _run_image_writer(project, job)

    brief_text = str(job.get("brief") or "")
    # The brief sometimes carries the task board (a JSON blob) or fenced examples. Models mirror it
    # back as their "answer" instead of a patch, which is what produced "no file patch applied".
    brief_text = re.sub(r"```.*?```", "", brief_text, flags=re.S)
    brief_text = re.sub(r'\{\s*"tasks"\s*:.*', "", brief_text, flags=re.S)
    marker = brief_text.find("PROJECT TASK")
    if marker > 0:
        brief_text = brief_text[marker:]
    elif brief_text.startswith("FREE BUILD"):
        brief_text = brief_text[brief_text.find("Operator instruction"):]
    file_ctx = _gather_project_context(project, str(job.get("title") or "") + "\n" + brief_text)
    proj_ctx = str(job.get("context") or "")[:3000]
    task = ("TASK " + str(job.get("title") or "") + "\n" + brief_text[:3200] + "\n"
            + (f"\nPROJECT SUMMARY:\n{proj_ctx}\n" if proj_ctx else "") + file_ctx + "\n")
    system = (
        "You are a LYGO Forge build worker. You do NOT have external tool calls. Never output "
        '{"action": "read"} or tool-call JSON. Output ONLY the requested JSON patch object.'
    )
    task_slug = str(job.get("task") or "module").lower().replace("-", "_")
    instruction = (
        "You are a build worker. Answer with a SINGLE JSON object and nothing else - no prose, no\n"
        "markdown fence, no questions. Produce the file changes directly:\n\n"
        '{"summary": "one line",\n'
        f' "files": [{{"path": "src/{task_slug}.js", "content": "full file contents"}}],\n'
        ' "edits": [{"path": "TECH_SPEC.md", "old": "exact existing lines", "new": "replacement lines"}],\n'
        ' "commands": [], "blocked": ""}\n\n'
        "Rules:\n"
        "- relative paths only, no '..'\n"
        "- use the exact file path requested in the TASK Acceptance/Scope (or the task module path above)\n"
        "- for NEW files or small files (< 3500 bytes), put complete file contents in `files`\n"
        "- for EXISTING files > 3500 bytes (like src/main.js or TECH_SPEC.md), NEVER overwrite with a stub; use `edits` with exact `old`/`new` strings (or for .md files, put the new section to append)\n"
        "- text files only (md, js, css, html, json, py, txt)\n"
        "- NEVER set `blocked` just because you cannot run a live browser or binary tool: implement the required JS code, probe, manifest, or markdown section using the provided project context, and leave `blocked` as \"\".\n\n"
    )

    def _call_with_fallback(prompt_str: str) -> tuple[str, str]:
        # Always give the paid/bridge endpoint its turn. A cooldown left over from an earlier
        # failure used to silently skip it for 15 minutes, which looked like "the API never works".
        use_8082 = primary_base.startswith("http://127.0.0.1:8082")
        if use_8082:
            try:
                return _http_chat(primary_base, primary_model, prompt_str, timeout=200, system=system, max_tokens=2800), primary_model
            except Exception as exc:
                cool_down("nvidia-glm", 15, str(exc))
                cool_down("nvidia-nemotron", 15, str(exc))
                print(f"[forge] {agent.get('id')} on 8082 failed/hung ({exc}); falling back to LYGO Engine on 8081", flush=True)
                import os as _os
                if _os.environ.get("FORGE_DEBUG_FALLBACK"):
                    import traceback as _tb
                    _tb.print_exc()
        return _http_chat("http://127.0.0.1:8081/v1", "Qwen3-4B-Instruct-2507", prompt_str, timeout=300, system=system, max_tokens=2800), "Qwen3-4B-Instruct-2507"

    text, used_model = _call_with_fallback(instruction + task)
    data = _extract_json(text)
    written, skipped = _write_files(project, data.get("files") or [], data.get("edits") or [])
    if not written:
        _shrink = [str(x) for x in skipped if "destructive shrink" in str(x)]
        _shrink_paths = [x.split("(")[0].split(":")[-1].strip() for x in _shrink]
        nudge = (instruction + task
                 + (("\nYou tried to REPLACE " + ", ".join(_shrink_paths)
                     + " with a much smaller file and the writer refused it. Do NOT put those paths in "
                       "`files`. Return `edits` entries only, each a small exact snippet:\n"
                       '{"edits": [{"path": "<one of those paths>", "old": "exact existing lines", '
                       '"new": "replacement lines"}]}\n')
                    if _shrink_paths else "")
                 + "\nYour previous answer contained no valid file writes"
                 + (f" (skipped: {'; '.join(skipped)})" if skipped else "")
                 + (f" (do NOT block on '{data.get('blocked')}' — write the required spec/module using the provided context)" if data.get("blocked") else "")
                 + ". Return the JSON object now, with at least one valid entry in `files` or `edits` and `blocked` set to \"\".")
        text2 = _http_chat("http://127.0.0.1:8081/v1", "Qwen3-4B-Instruct-2507", nudge, timeout=300, system=system, max_tokens=2800)
        used_model = "Qwen3-4B-Instruct-2507"
        data = _extract_json(text2)
        written, skipped = _write_files(project, data.get("files") or [], data.get("edits") or [])
    if not written and data.get("blocked"):
        raise RuntimeError("worker blocked: " + str(data["blocked"])[:200])
    if not written:
        raise RuntimeError("worker returned no files" + (f" (skipped: {'; '.join(skipped)})" if skipped else ""))
    out = [f"SUMMARY: {data.get('summary', '')} [via {used_model}]".strip()]
    out.append("FILES CHANGED:")
    for w in written:
        try:
            size = (project / w).stat().st_size
        except OSError:
            size = 0
        out.append(f"- {w} ({size} bytes)")
    if skipped:
        out.append("SKIPPED: " + "; ".join(skipped))
    if data.get("commands"):
        out.append("COMMANDS: " + " | ".join(str(c) for c in data["commands"][:5]))
    return "\n".join(out)


def _run_master(agent: dict, job: dict) -> str:
    """Forge Master execution: tries Free APIs first (NVIDIA 8082, then Gemini CLI), falling back to Local Engine (8081)."""
    if not agent_cooling("nvidia-nemotron") and _http_models("http://127.0.0.1:8082/v1"):
        try:
            return _run_api_writer({**agent, "kind": "nvidia", "endpoint": "http://127.0.0.1:8082/v1",
                                    "model": "nvidia/nemotron-3-ultra-550b-a55b"}, job)
        except Exception as exc:
            cool_down("nvidia-nemotron", 10, str(exc))
    if _gemini_key() and GEMINI_BIN.exists() and not agent_cooling("gemini-3-flash"):
        try:
            return _run_gemini({"id": "gemini-3-flash", "model": "gemini-3-flash-preview"}, job)
        except Exception as exc:
            cool_down("gemini-3-flash", 15, str(exc))
    return _run_api_writer({**agent, "kind": "local", "endpoint": "http://127.0.0.1:8081/v1",
                            "model": "Qwen3-4B-Instruct-2507"}, job)


def _run_local(agent: dict, job: dict) -> str:
    payload = {
        "model": agent.get("model", "gemma-4-12B-it-qat-UD-Q4_K_XL"),
        "messages": [
            {"role": "system", "content": "You are a LYGO Forge reasoning worker. You have no filesystem, shell, browser or scene tools. Never emit tool calls, fake reads, or claims of inspecting files. Use only the job context. Follow the skill and return evidence."},
            {"role": "user", "content": _job_prompt(job, job.get("skill", "forge-worker"))},
        ],
        "max_tokens": 2500,
        "temperature": 0.2,
    }
    req = urllib.request.Request(
        agent["endpoint"].rstrip("/") + "/chat/completions",
        data=json.dumps(payload).encode(),
        headers={"Authorization": "Bearer local", "Content-Type": "application/json"},
        method="POST",
    )
    timeout = int(os.environ.get("LYGO_LLM_TIMEOUT", "3600"))
    with urllib.request.urlopen(req, timeout=timeout) as r:
        data = json.loads(r.read().decode("utf-8", "replace"))
    content = (data.get("choices") or [{}])[0].get("message", {}).get("content")
    if not content:
        raise RuntimeError("empty worker response")
    return content


def mark_opencode_blocked(reason: str) -> None:
    DATA_HOME.mkdir(parents=True, exist_ok=True)
    OPENCODE_QUOTA_FILE.write_text(json.dumps({"blocked": True, "reason": reason, "detected": _now()}, indent=2) + "\n", encoding="utf-8")


def reset_opencode_quota() -> None:
    OPENCODE_QUOTA_FILE.unlink(missing_ok=True)


def _run_opencode(agent: dict, job: dict) -> str:
    if OPENCODE_QUOTA_FILE.exists():
        raise RuntimeError("OpenCode free quota is marked exhausted; reset after subscribing or wait for reset")
    prompt = _job_prompt(job, job.get("skill", "forge-worker"))
    auto = [] if str(job.get("skill", "")).startswith("forge-gauntlet-") else ["--auto"]
    brief_path = _brief_file(job, prompt)
    print(f"[forge] brief written to {brief_path} ({len(prompt)} chars)", flush=True)
    cmd = [str(OPENCODE), "run", "--format", "json", *auto, "--model",
           agent.get("model", "opencode/deepseek-v4.1-flash-free"),
           "Execute the brief in the attached file. Write the real files it asks for.",
           "-f", str(brief_path)]
    env = os.environ.copy()
    env.pop("ELECTRON_RUN_AS_NODE", None)
    timeout = int(os.environ.get("LYGO_OPENCODE_TIMEOUT", "3600"))
    proc = subprocess.Popen(cmd, cwd=job.get("project_path") or str(PROJECTS_ROOT), env=env,
                            stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True,
                            encoding="utf-8", errors="replace")
    _reg_pid(job["id"], proc.pid)
    try:
        raw, err = _stream_proc(proc, job["id"], timeout)
    except RuntimeError:
        proc.kill()
        raw, err = proc.communicate()
        if "Free usage limit" in (err or "") or "usage limit" in (err or "").lower():
            mark_opencode_blocked("Free usage limit reached")
            raise RuntimeError("OpenCode free quota reached; worker blocked")
        raise RuntimeError(f"OpenCode worker timed out after {timeout}s")
    if "Free usage limit" in (err or "") or "AI_APICallError" in (err or ""):
        mark_opencode_blocked("Free usage limit reached")
        raise RuntimeError("OpenCode free quota reached; worker blocked")
    texts = []
    for line in (raw or "").splitlines():
        line = line.strip()
        if not line.startswith("{"):
            continue
        try:
            event = json.loads(line)
        except Exception:
            continue
        part = event.get("part") or {}
        if event.get("type") == "text" and part.get("text"):
            texts.append(part["text"])
    out = "\n".join(texts).strip()
    if proc.returncode != 0:
        raise RuntimeError(f"OpenCode worker exit {proc.returncode}: {(err or '')[-1500:]}")
    if not out:
        raise RuntimeError("OpenCode worker returned no assistant text")
    return out[-12000:]


def _run_shared(agent: dict, job: dict) -> str:
    if not SHARED_CLI.exists():
        raise RuntimeError("shared task CLI missing")
    body = _job_prompt(job, job.get("skill", "forge-worker"))
    cmd = [str(PYTHON), str(SHARED_CLI), "post", "--from", "forge", "--to", "stream",
           "--kind", "task", "--title", job.get("title", job["id"]), "--body", body, "--priority", "5"]
    proc = subprocess.run(cmd, cwd=str(SHARED_ROOT), capture_output=True, text=True, timeout=60)
    out = (proc.stdout or "") + (proc.stderr or "")
    if proc.returncode != 0:
        raise RuntimeError("shared post failed: " + out[-1000:])
    job["remote"] = {"bus": "stream", "posted_at": _now(), "cli": out[-2000:]}
    return "POSTED_TO_STREAM_BUS\n" + out[-4000:]


def _run_pdhowler(agent: dict, job: dict) -> str:
    if not PDHOWLER_CONVERT.exists():
        raise RuntimeError("PD Howler convert.exe not found")
    if not any(x in job.get("title", "").lower() for x in ("smoke", "boot", "test", "convert")):
        raise RuntimeError("PD Howler adapter currently supports conversion smoke jobs only")
    out_dir = Path(job.get("project_path") or "") / "assets" / "working"
    out_dir.mkdir(parents=True, exist_ok=True)
    source = out_dir / f"{job['id']}-pdhowler-source.png"
    final = out_dir / f"{job['id']}-pdhowler.png"
    proc1 = subprocess.run([str(PDHOWLER_CONVERT), "-size", "256x256", "gradient:#123456-#abcdef", str(source)],
                           capture_output=True, text=True, timeout=120)
    if proc1.returncode != 0:
        raise RuntimeError("PD Howler source conversion failed: " + (proc1.stderr or proc1.stdout)[-1000:])
    proc2 = subprocess.run([str(PDHOWLER_CONVERT), str(source), "-resize", "64x64", "-colorspace", "sRGB", str(final)],
                           capture_output=True, text=True, timeout=120)
    if proc2.returncode != 0 or not final.exists() or final.stat().st_size == 0:
        raise RuntimeError("PD Howler output conversion failed: " + (proc2.stderr or proc2.stdout)[-1000:])
    return (
        "PDHOWLER_CONVERT_OK\n"
        f"Source: {source} ({source.stat().st_size} bytes)\n"
        f"Output: {final} ({final.stat().st_size} bytes)\n"
        "Adapter: ImageMagick 6.2.2 convert.exe\n"
        "Limit: conversion/resize test only; PD Howler painting remains GUI-only."
    )


def _run_rpgmaker(agent: dict, job: dict) -> str:
    root = Path(job.get("project_path") or "")
    data = root / "data"
    if not data.is_dir():
        raise RuntimeError("RPG Maker data directory not found")
    data_files = sorted(data.glob("*.json"))
    maps = sorted(data.glob("Map*.json"))

    def read_json(path: Path):
        raw = path.read_bytes()
        for enc in ("utf-8-sig", "utf-16", "cp1252"):
            try:
                return json.loads(raw.decode(enc))
            except Exception:
                continue
        raise RuntimeError(f"unreadable JSON: {path}")

    system = read_json(data / "System.json") if (data / "System.json").exists() else None
    actors = read_json(data / "Actors.json") if (data / "Actors.json").exists() else None
    if system is None or actors is None:
        raise RuntimeError("System.json and Actors.json are required")
    system_count = len(system) if isinstance(system, (dict, list)) else 0
    actor_count = len(actors) if isinstance(actors, list) else len(actors.get("data", [])) if isinstance(actors, dict) else 0
    return (
        "RPGMAKER_VALIDATE_OK\n"
        f"Project: {root}\n"
        f"Data files: {len(data_files)}\n"
        f"Maps: {len(maps)}\n"
        f"Actors: {actor_count}\n"
        f"System keys: {system_count}\n"
        "Mode: read-only validation; no project files changed."
    )


RPGMAKER_AUTHOR_HOME = Path(r"<PROJECTS>\rpgmaker-tool-sandbox")


def _rpgmaker_author_sandbox() -> Path:
    return RPGMAKER_AUTHOR_HOME.resolve()


def _run_rpgmaker_author(agent: dict, job: dict) -> str:
    root = Path(job.get("project_path") or "").resolve()
    sandbox = _rpgmaker_author_sandbox()
    if root != sandbox:
        raise RuntimeError("RPG Maker authoring is restricted to the disposable sandbox")
    data = root / "data"
    map_path = data / "Map001.json"
    if not map_path.exists():
        raise RuntimeError("Map001.json missing")
    raw = map_path.read_bytes()
    original_hash = "sha256:" + __import__("hashlib").sha256(raw).hexdigest()
    backup_dir = data / "_forge_backups"
    backup_dir.mkdir(parents=True, exist_ok=True)
    backup = backup_dir / ("Map001." + time.strftime("%Y%m%d-%H%M%S") + ".json")
    backup.write_bytes(raw)
    doc = json.loads(raw.decode("utf-8-sig"))
    events = doc.setdefault("events", [])
    free = None
    for idx in range(1, len(events)):
        if events[idx] is None:
            free = idx
            break
    if free is None:
        events.append(None)
        free = len(events) - 1
    event_id = max([e.get("id", 0) for e in events if isinstance(e, dict)] or [0]) + 1
    event = {
        "id": event_id,
        "name": "FORGE_AUTHOR_TEST",
        "note": "Created by LYGO Forge in a disposable sandbox.",
        "x": 5,
        "y": 5,
        "pages": [{
            "conditions": {
                "actorId": 1, "actorValid": False, "itemId": 1, "itemValid": False,
                "selfSwitchCh": "A", "selfSwitchValid": False,
                "switch1Id": 1, "switch1Valid": False,
                "switch2Id": 1, "switch2Valid": False,
                "variableId": 1, "variableValid": False, "variableValue": 0,
            },
            "directionFix": False,
            "image": {"characterIndex": 0, "characterName": "", "direction": 2, "pattern": 0, "tileId": 0},
            "list": [
                {"code": 101, "indent": 0, "parameters": ["", 0, 0, 2]},
                {"code": 401, "indent": 0, "parameters": ["FORGE AUTHOR TEST"]},
                {"code": 0, "indent": 0, "parameters": []},
            ],
            "moveFrequency": 3,
            "moveRoute": {"list": [{"code": 0, "parameters": []}], "repeat": True, "skippable": False, "wait": False},
            "moveSpeed": 3, "moveType": 0, "priorityType": 1,
            "stepAnime": False, "through": False, "trigger": 0, "walkAnime": True,
        }],
    }
    events[free] = event
    tmp = map_path.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(doc, indent=2, ensure_ascii=False), encoding="utf-8")
    check = json.loads(tmp.read_text(encoding="utf-8"))
    if not any(isinstance(e, dict) and e.get("id") == event_id for e in check.get("events", [])):
        raise RuntimeError("event validation failed before replace")
    tmp.replace(map_path)
    new_hash = "sha256:" + __import__("hashlib").sha256(map_path.read_bytes()).hexdigest()
    return (
        "RPGMAKER_AUTHOR_OK\n"
        f"Project: {root}\n"
        f"Map: {map_path}\n"
        f"Event: {event_id} FORGE_AUTHOR_TEST at 5,5\n"
        f"Event count: {len(check.get('events', []))}\n"
        f"Backup: {backup}\n"
        f"Original hash: {original_hash}\n"
        f"New hash: {new_hash}\n"
        "Validation: JSON parsed, event id present, command list ends with 0.\n"
        "Runtime verification: pending; open the sandbox project in RPG Maker MV."
    )


def rollback_rpgmaker() -> dict:
    root = _rpgmaker_author_sandbox()
    data = root / "data"
    map_path = data / "Map001.json"
    backups = sorted((data / "_forge_backups").glob("Map001.*.json"))
    if not backups:
        raise ValueError("no RPG Maker backup found")
    latest = backups[-1]
    before = map_path.read_bytes()
    map_path.write_bytes(latest.read_bytes())
    doc = json.loads(map_path.read_text(encoding="utf-8-sig"))
    return {"restored": str(latest), "event_count": len(doc.get("events", [])),
            "before_hash": "sha256:" + __import__("hashlib").sha256(before).hexdigest(),
            "after_hash": "sha256:" + __import__("hashlib").sha256(map_path.read_bytes()).hexdigest()}


def _run_asset_foundry(agent: dict, job: dict) -> str:
    """Real Foundry tool worker. The brief is a JSON object, not prose."""
    import hashlib
    import json
    raw = (job.get("brief") or "").strip()
    try:
        spec = json.loads(raw)
    except Exception as exc:
        raise RuntimeError("foundry brief must be JSON: " + str(exc))
    subject = str(spec.get("subject") or "").strip()
    if not subject:
        raise RuntimeError("foundry brief requires subject")
    kind = str(spec.get("kind") or "creature")
    pack = str(spec.get("pack") or "forge-character")
    name = str(spec.get("name") or "character")
    cmd = [
        str(FOUNDRY_PY), str(FOUNDRY_FORGE), "generate",
        "--kind", kind, "--contract", str(spec.get("contract") or "lattice-arena"),
        "--pack", pack, "--name", name, "--subject", subject,
        "--seed", str(spec.get("seed", 4242)),
        "--width", str(spec.get("width", 512)), "--height", str(spec.get("height", 512)),
        "--max-vram", "5", "--no-offload", "--params-backend", "diffusion=disk",
        "--timeout", os.environ.get("LYGO_FOUNDRY_WORKER_TIMEOUT", "3300"),
    ]
    if spec.get("init_image"):
        cmd += ["--init-image", str(spec["init_image"]), "--strength", str(spec.get("strength", 0.4))]
    if spec.get("cutout_key"):
        cmd.append("--no-cutout")
    if spec.get("force"):
        cmd.append("--force")
    cutout_note = ""
    with FOUNDRY_LOCK:
        proc = subprocess.run(cmd, capture_output=True, text=True, cwd=str(FOUNDRY_ROOT), timeout=int(os.environ.get("LYGO_FOUNDRY_TIMEOUT", "3600")))
        if proc.returncode != 0:
            raise RuntimeError("foundry failed: " + (proc.stderr or proc.stdout)[-1200:])
        raw_path = FOUNDRY_ROOT / "packs" / pack / "raw" / (name + ".png")
        if spec.get("cutout_key"):
            keyed = raw_path.with_name(name + "_rgba.png")
            cut = subprocess.run([str(FOUNDRY_PY), str(FOUNDRY_FORGE), "cutout", str(raw_path),
                                  "--out", str(keyed), "--key", str(spec["cutout_key"]),
                                  "--edge-threshold", str(spec.get("edge_threshold", 55))],
                                 capture_output=True, text=True, cwd=str(FOUNDRY_ROOT), timeout=300)
            if cut.returncode != 0:
                raise RuntimeError("foundry cutout failed: " + (cut.stderr or cut.stdout)[-1200:])
            raw_path = keyed
            cutout_note = (cut.stdout or "").strip()[-600:]
    if not raw_path.exists():
        raise RuntimeError("foundry completed but expected output missing: " + str(raw_path))
    digest = hashlib.sha256(raw_path.read_bytes()).hexdigest()
    validation = ""
    try:
        vp = subprocess.run([str(FOUNDRY_PY), str(FOUNDRY_FORGE), "validate", str(raw_path)],
                            capture_output=True, text=True, cwd=str(FOUNDRY_ROOT), timeout=120)
        validation = (vp.stdout or vp.stderr or "").strip()[-1200:]
    except Exception as exc:
        validation = "validation error: " + str(exc)
    return (
        "FOUNDRY_OK\n"
        "path: " + str(raw_path) + "\n"
        "sha256: " + digest + "\n"
        + validation + "\n" + cutout_note
    )


def _run_unity_build(agent: dict, job: dict) -> str:
    spec = json.loads((job.get("brief") or "").strip())
    project = str(spec.get("project") or job.get("project_path") or "").strip()
    if not project:
        raise RuntimeError("unity-build brief requires project")
    target = str(spec.get("target") or "StandaloneWindows64")
    raw_output = Path(spec.get("output_path") or (DATA_HOME / "jobs" / job["id"] / "build"))
    # Unity's --output-path is the executable file for desktop targets; the
    # _Data folder is created beside it. A bare directory is normalized to
    # <dir>/Game.exe so release packaging captures the whole player.
    if raw_output.suffix.lower() == ".exe":
        output_exe = raw_output
        output_dir = raw_output.parent
    else:
        output_dir = raw_output
        output_exe = raw_output / "Game.exe"
    output_dir.mkdir(parents=True, exist_ok=True)
    output = str(output_exe)
    if not UNITY_CLI.exists():
        raise RuntimeError("Unity CLI missing")
    cmd = [str(UNITY_CLI), "build", project, "--target", target,
           "--output-path", output, "--format", "json", "--non-interactive"]
    if spec.get("execute_method"):
        cmd += ["--execute-method", str(spec["execute_method"])]
    if spec.get("editor_version"):
        cmd += ["--editor-version", str(spec["editor_version"])]
    if spec.get("allow_dirty"):
        cmd += ["--allow-dirty-build"]
    proc = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=3600)
    if proc.returncode != 0:
        raise RuntimeError("unity build failed: " + (proc.stderr or proc.stdout)[-1800:])
    return "UNITY_BUILD_OK\n" + (proc.stdout or "")[-2200:] + "\nOutput exe: " + output + "\nOutput dir: " + str(output_dir)


def _run_triposr(agent: dict, job: dict) -> str:
    spec = json.loads((job.get("brief") or "").strip())
    image = str(spec.get("image") or "").strip()
    if not image:
        raise RuntimeError("triposr brief requires image")
    out = str(spec.get("out") or (DATA_HOME / "jobs" / job["id"] / "triposr"))
    cmd = [str(PYTHON), str(PIPELINE / "triposr.py"), "--image", image, "--out", out,
           "--mc-resolution", str(spec.get("mc_resolution", 256))]
    if spec.get("bake_texture"):
        cmd += ["--bake-texture", "--texture-resolution", str(spec.get("texture_resolution", 2048))]
    if spec.get("gpu"):
        cmd += ["--gpu", "--lease-owner", "forge"]
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=1850)
    if proc.returncode != 0:
        raise RuntimeError("triposr failed: " + (proc.stderr or proc.stdout)[-1400:])
    return "TRIPOSR_OK\n" + (proc.stdout or "")[-2200:]


def _run_playtest_web(agent: dict, job: dict) -> str:
    spec = json.loads((job.get("brief") or "").strip())
    url = str(spec.get("url") or "").strip()
    if not url:
        raise RuntimeError("playtest brief requires url")
    out = str(spec.get("out") or (DATA_HOME / "jobs" / job["id"] / "playtest"))
    cmd = [str(NODE), str(PIPELINE / "playtest_web.mjs"), "--url", url, "--out", out,
           "--wait", str(spec.get("wait", 2500))]
    if spec.get("actions"):
        cmd += ["--actions", json.dumps(spec["actions"])]
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
    if proc.returncode != 0:
        raise RuntimeError("playtest failed: " + (proc.stderr or proc.stdout)[-1400:])
    return "PLAYTEST_OK\n" + (proc.stdout or "")[-2200:]


def _run_audio_batch(agent: dict, job: dict) -> str:
    brief = str(job.get("brief") or "").strip()
    project = str(job.get("project_path") or "").strip()
    if not brief or not project:
        raise RuntimeError("audio brief requires JSON brief and project_path")
    cmd = [str(PYTHON), str(PIPELINE / "audio_batch.py"), "--project", project, "--brief", brief]
    proc = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=900)
    if proc.returncode != 0:
        raise RuntimeError("audio batch failed: " + (proc.stderr or proc.stdout)[-1800:])
    return "AUDIO_BATCH_OK\n" + (proc.stdout or "")[-6000:]


def _run_release(agent: dict, job: dict) -> str:
    spec = json.loads((job.get("brief") or "").strip())
    project = str(spec.get("project") or job.get("project_path") or "").strip()
    build = str(spec.get("build") or "").strip()
    version = str(spec.get("version") or "0.1.0")
    out = str(spec.get("out") or (DATA_HOME / "jobs" / job["id"] / "release"))
    if not project or not build:
        raise RuntimeError("release brief requires project and build")
    cmd = [str(PYTHON), str(PIPELINE / "release.py"), "--project", project, "--build", build,
           "--version", version, "--out", out, "--name", str(spec.get("name") or ""),
           "--engine", str(spec.get("engine") or "unknown")]
    proc = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
    if proc.returncode != 0:
        raise RuntimeError("release failed: " + (proc.stderr or proc.stdout)[-1400:])
    return "RELEASE_OK\n" + (proc.stdout or "")[-2200:]


def _run_unity(agent: dict, job: dict) -> str:
    if not UNITY_CLI.exists():
        raise RuntimeError("Unity CLI missing")
    project = Path(job.get("project_path") or "")
    out = DATA_HOME / "jobs" / f"{job['id']}-unity-tests.xml"
    out.parent.mkdir(parents=True, exist_ok=True)
    mode = "PlayMode" if "playmode" in (str(job.get("title", "")) + " " + str(job.get("brief", ""))).lower() else "EditMode"
    cmd = [str(UNITY_CLI), "test", str(project), "--editor-version", "6000.5.9f1",
           "--mode", mode, "--report-format", "junit", "--output", str(out),
           "--non-interactive", "--timeout", "600"]
    proc = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=900)
    if proc.returncode != 0:
        raise RuntimeError(f"Unity tests failed ({proc.returncode}): {(proc.stderr or proc.stdout)[-1800:]}")
    import xml.etree.ElementTree as ET
    root = ET.parse(out).getroot()
    suite = root.find("testsuite") if root.tag == "testsuites" else root
    tests = int(suite.attrib.get("tests", "0"))
    failures = int(suite.attrib.get("failures", "0"))
    errors = int(suite.attrib.get("errors", "0"))
    skipped = int(suite.attrib.get("skipped", "0"))
    if failures or errors:
        raise RuntimeError(f"Unity tests: {tests} tests, {failures} failures, {errors} errors")
    return (f"UNITY_TEST_OK tests={tests} failures={failures} errors={errors} skipped={skipped}\n"
            f"Project: {project}\nReport: {out}\n"
            f"Mode: {mode}; read-only test execution.")


def _blender_path() -> Path | None:
    candidates = [str(BLENDER)] if str(BLENDER) else []
    candidates += [os.environ.get("LYGO_BLENDER", "")]
    for raw in candidates:
        if raw and Path(raw).exists():
            return Path(raw)
    for raw in (r"C:\Program Files\Blender Foundation\Blender 4.5\blender.exe",
                r"C:\Program Files\Blender Foundation\Blender 4.4\blender.exe",
                r"C:\Program Files\Blender Foundation\Blender 4.3\blender.exe",
                r"C:\Program Files\Blender Foundation\Blender 4.2\blender.exe",
                r"<USER>\AppData\Local\Blender Foundation\Blender\blender.exe"):
        if Path(raw).exists():
            return Path(raw)
    return None


def _run_blender(agent: dict, job: dict) -> str:
    exe = _blender_path()
    if not exe:
        raise RuntimeError("Blender executable not found; set LYGO_BLENDER")
    if not any(x in job.get("title", "").lower() for x in ("smoke", "boot", "test")):
        raise RuntimeError("Blender adapter currently runs smoke/export jobs only; create a scripted Blender job")
    DATA_HOME.mkdir(parents=True, exist_ok=True)
    script = DATA_HOME / "jobs" / f"{job['id']}-blender-smoke.py"
    out = DATA_HOME / "jobs" / f"{job['id']}-blender-smoke.glb"
    script.parent.mkdir(parents=True, exist_ok=True)
    script.write_text(
        "import bpy\n"
        "print('FORGE_BLENDER_OK', bpy.app.version_string)\n"
        "bpy.ops.mesh.primitive_cube_add(size=1.0)\n"
        f"bpy.ops.export_scene.gltf(filepath=r'{out}', export_format='GLB')\n"
        "print('FORGE_BLENDER_EXPORT', r'" + str(out) + "')\n",
        encoding="utf-8",
    )
    proc = subprocess.run([str(exe), "-b", "--factory-startup", "--python", str(script)], capture_output=True,
                          text=True, encoding="utf-8", errors="replace", timeout=300)
    text = (proc.stdout or "") + ("\n" + proc.stderr if proc.stderr else "")
    if proc.returncode != 0 or "FORGE_BLENDER_OK" not in text:
        raise RuntimeError("Blender failed: " + text[-1500:])
    if not out.exists() or out.stat().st_size == 0:
        raise RuntimeError("Blender ran but no GLB was produced")
    return text + f"\nGLB={out} BYTES={out.stat().st_size}"


# ---------------------------------------------------------------- live worker registry
# job id -> pid of the worker process. The dispatcher never recorded this before, so a hung job could
# not be killed precisely and a stall was undetectable.
ACTIVE_PIDS: dict[str, int] = {}


PIDS_FILE = DATA_HOME / "active-pids.json"


def _save_pids() -> None:
    try:
        PIDS_FILE.write_text(json.dumps(ACTIVE_PIDS, indent=2), encoding="utf-8")
    except Exception:
        pass


def _load_pids() -> None:
    """Restore the pid map after a restart.

    Without this, a Forge restart made every live worker look like an orphan: the registry was
    in-memory only, so the reaper killed a job that was still legitimately running (measured
    2026-10-28 - JOB-A39BFD63 went 'working' with zero processes).
    """
    try:
        if PIDS_FILE.exists():
            data = json.loads(PIDS_FILE.read_text(encoding="utf-8"))
            if isinstance(data, dict):
                for k, v in data.items():
                    try:
                        ACTIVE_PIDS[str(k)] = int(v)
                    except Exception:
                        pass
    except Exception:
        pass


def _reg_pid(job_id: str, pid: int) -> None:
    ACTIVE_PIDS[str(job_id)] = int(pid)
    _save_pids()


def _drop_pid(job_id: str) -> None:
    ACTIVE_PIDS.pop(str(job_id), None)
    _save_pids()


_load_pids()


def active_pids() -> dict[str, int]:
    return dict(ACTIVE_PIDS)


def kill_tree(pid: int, timeout: int = 20) -> bool:
    """Kill a worker and its children. Returns True if the pid is gone afterwards."""
    try:
        subprocess.run(["taskkill", "/PID", str(int(pid)), "/T", "/F"],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=timeout)
    except Exception:
        pass
    try:
        return not _pid_alive(pid)
    except Exception:
        return True


def _pid_alive(pid: int) -> bool:
    try:
        out = subprocess.run(["tasklist", "/FI", f"PID eq {int(pid)}", "/NH"],
                             capture_output=True, text=True, timeout=15).stdout or ""
        return str(int(pid)) in out
    except Exception:
        return False


def requeue(job_id: str, reason: str, bump: bool = True) -> dict:
    """Put a job back in the queue with the reason recorded. Used by stall detection and retries."""
    with LOCK:
        jobs = load_jobs()
        job = next((j for j in jobs if j["id"] == job_id), None)
        if not job:
            return {"error": "job not found"}
        job["status"] = "queued"
        job["error"] = str(reason)[:400]
        job["finished"] = None
        job["agent"] = None
        job["agent_name"] = None
        if bump:
            job["attempts"] = int(job.get("attempts") or 0) + 1
        save_jobs(jobs)
    _drop_pid(job_id)
    return {"ok": True, "job": job}


def _finish_job(job_id: str, status: str, result: str = "", error: str = "") -> None:
    _drop_pid(job_id)
    with LOCK:
        jobs = load_jobs()
        job = next((j for j in jobs if j["id"] == job_id), None)
        if not job:
            return
        job["status"] = status
        job["finished"] = _now()
        job["elapsed"] = round(job["finished"] - (job.get("started") or job.get("created") or job["finished"]), 1)
        if result:
            job["result"] = result[-40000:]
        if error:
            job["error"] = error[-4000:]
        agents = load_agents()
        agent = next((a for a in agents if a["id"] == job.get("agent")), None)
        if agent:
            agent["current_job"] = None
            agent["status"] = "standby" if agent.get("kind") == "local" else "ready"
            st = agent.setdefault("stats", {"done": 0, "failed": 0, "total_seconds": 0, "last_result": ""})
            if status == "returned":
                st["done"] = st.get("done", 0) + 1
                st["total_seconds"] = round(st.get("total_seconds", 0) + (job.get("elapsed") or 0), 1)
            elif status == "failed":
                st["failed"] = st.get("failed", 0) + 1
            st["last_result"] = status
            save_agents(agents)
        save_jobs(jobs)


def mark_dispatched(job_id: str, result: str) -> None:
    """Remote bus jobs are posted, not complete. Never fake a returned result."""
    with LOCK:
        jobs = load_jobs()
        job = next((j for j in jobs if j["id"] == job_id), None)
        if not job:
            return
        job["status"] = "dispatched"
        job["posted"] = _now()
        job["result"] = result[-8000:]
        agents = load_agents()
        agent = next((a for a in agents if a["id"] == job.get("agent")), None)
        if agent:
            agent["current_job"] = None
            agent["status"] = "standby" if agent.get("kind") == "local" else "ready"
            agent["detail"] = "job posted to remote shared bus"
            save_agents(agents)
        save_jobs(jobs)
        reconcile_agents(load_agents())


def _try_fallback(job_id: str, exc: Exception) -> bool:
    with LOCK:
        jobs = load_jobs()
        job = next((j for j in jobs if j["id"] == job_id), None)
        if not job:
            return False
        agent = get_agent(job.get("agent"))
        fallback = (agent or {}).get("fallback", "")
        fallback_agent = get_agent(fallback) if fallback else None
        if not fallback or job.get("attempts", 0) >= 2 or fallback == job.get("agent"):
            return False
        if not fallback_agent or fallback_agent.get("status") not in ("ready", "standby"):
            return False
        job["status"] = "queued"
        job["error"] = f"primary {job.get('agent')} failed: {type(exc).__name__}: {exc}"
        job["fallback_used"] = fallback
        save_jobs(jobs)
    res = dispatch(job_id, fallback)
    return bool(res.get("ok"))


def run_job(job_id: str) -> None:
    with LOCK:
        jobs = load_jobs()
        job = next((j for j in jobs if j["id"] == job_id), None)
        if not job or job["status"] != "working":
            return
        agent = get_agent(job.get("agent"))
        if not agent:
            _finish_job(job_id, "failed", error="assigned agent not found")
            return
    try:
        kind = agent.get("kind")
        if kind == "master":
            result = _run_master(agent, job)
        elif kind in ("local", "nvidia") and (job.get("task") or str(job.get("skill") or "") in BUILD_SKILLS):
            # write-through: the API answers with a JSON file patch, the Forge writes it
            result = _run_api_writer(agent, job)
        elif kind in ("local", "nvidia"):
            result = _run_local(agent, job)
        elif kind == "gemini":
            result = _run_gemini(agent, job)
        elif kind == "opencode":
            result = _run_opencode(agent, job)
        elif kind == "shared":
            result = _run_shared(agent, job)
            mark_dispatched(job_id, result)
            return
        elif kind == "blender":
            result = _run_blender(agent, job)
        elif kind == "unity":
            result = _run_unity(agent, job)
        elif kind == "tool":
            if agent.get("id") == "foundry-local":
                result = _run_asset_foundry(agent, job)
            elif agent.get("id") == "pdhowler":
                result = _run_pdhowler(agent, job)
            elif agent.get("id") == "rpgmaker-mv":
                if job.get("skill") == "forge-rpgmaker-author-worker":
                    result = _run_rpgmaker_author(agent, job)
                else:
                    result = _run_rpgmaker(agent, job)
            elif agent.get("id") == "unity-build":
                result = _run_unity_build(agent, job)
            elif agent.get("id") == "triposr-local":
                result = _run_triposr(agent, job)
            elif agent.get("id") == "playtest-web":
                result = _run_playtest_web(agent, job)
            elif agent.get("id") == "audio-piper":
                result = _run_audio_batch(agent, job)
            elif agent.get("id") == "release-pack":
                result = _run_release(agent, job)
            else:
                raise RuntimeError(f"tool adapter not wired: {agent.get('id')}")
        else:
            raise RuntimeError(f"agent kind {kind} is not dispatchable")
        _finish_job(job_id, "returned", result=result)
    except Exception as exc:
        msg = str(exc).lower()
        if "quota" in msg or "429" in msg or "rate limit" in msg:
            cool_down(agent.get("id") if isinstance(agent, dict) else "", 15, str(exc))
        if _try_fallback(job_id, exc):
            return
        _finish_job(job_id, "failed", error=f"{type(exc).__name__}: {exc}")


# ---------------------------------------------------------------- worker capability
# A build task needs a worker that can change files on disk. API completions (nvidia, groq, local
# engine) write through `_run_api_writer`; `master` runs the Free-API -> Local-Engine fallback chain.
BUILD_SKILLS = {
    "forge-worker", "forge-web-worker", "forge-ui-worker", "forge-unity-worker",
    "forge-2d-map-worker", "forge-2d-character-worker", "forge-image-worker",
    "forge-audio-worker", "forge-blender-worker", "forge-rpgmaker-worker",
    "forge-rpgmaker-author-worker",
}


_AGENT_COOLDOWN: dict = {}


def cool_down(agent_id: str, minutes: float, reason: str = "") -> None:
    """Take a worker out of rotation after a hard failure (quota, 429, missing CLI)."""
    if not agent_id:
        return
    _AGENT_COOLDOWN[str(agent_id)] = time.time() + minutes * 60
    print(f"[forge] {agent_id} cooling down {minutes:.0f}m: {reason[:120]}", flush=True)


def agent_cooling(agent_id: str) -> bool:
    until = _AGENT_COOLDOWN.get(str(agent_id))
    return bool(until and until > time.time())


def writes_files(agent: dict) -> bool:
    """Can this worker change files on disk?

    opencode / gemini do it through their CLI; `nvidia` / `llm` / `local` do it through
    `_run_api_writer` (JSON file patch + surgical edits); `master` runs the full ladder.
    """
    return str(agent.get("kind") or "") in ("opencode", "gemini", "nvidia", "llm", "local", "master")


def _writable(candidates: list[dict], skill: str) -> list[dict]:
    """Narrow a candidate pool to file-writing workers for build skills."""
    if str(skill or "") not in BUILD_SKILLS:
        return candidates
    writable = [a for a in candidates if writes_files(a)]
    return writable


def dispatch(job_id: str, agent_id: str | None = None) -> dict:
    with LOCK:
        jobs = load_jobs()
        job = next((j for j in jobs if j["id"] == job_id), None)
        if not job:
            return {"error": "job not found"}
        if job["status"] not in ("queued", "rework"):
            return {"error": f"job is {job['status']}"}
        agents = refresh_agents()
        needs_writer = (not agent_id) and (bool(job.get("task")) or str(job.get("skill") or "") in BUILD_SKILLS)
        candidates = [a for a in agents if a.get("dispatchable") and a.get("status") == "ready"
                      and not agent_cooling(a.get("id"))]
        if needs_writer:
            writable = [a for a in candidates if writes_files(a)]
            if writable:
                candidates = writable
            else:
                # If all primary free API writers are cooling down, allow local-qwen / hermes-master immediately
                candidates = [a for a in agents if a.get("dispatchable") and writes_files(a) and a.get("id") in ("local-qwen", "hermes-master")]
        if agent_id:
            candidates = [a for a in agents if a.get("dispatchable") and a["id"] == agent_id and a.get("status") in ("ready", "standby")]
            if not candidates:
                return {"error": "worker busy or offline", "agent": agent_id}
        else:
            skill = job.get("skill")
            text = (str(job.get("title", "")) + " " + str(job.get("brief", ""))).lower()
            if skill == "forge-qa-worker" and any(k in text for k in ("unity", "playmode", "editmode", "test runner")):
                candidates = [a for a in agents if a.get("id") == "unity-test" and a.get("dispatchable") and a.get("status") in ("ready", "standby")]
                if not candidates:
                    return {"error": "Unity test requested but unity-test is unavailable; refusing LLM fallback"}
            else:
                candidates = [a for a in candidates if skill in a.get("skills", [])] or candidates
        if not candidates:
            return {"error": "no ready worker for this skill"}

        # Hard manager rail: an agent may own only one active job. This prevents
        # fallback from stacking several generations onto local-qwen.
        active = {j.get("agent") for j in jobs if j.get("status") == "working"}
        candidates = [a for a in candidates if a.get("id") not in active]
        if not candidates:
            return {"error": "all capable workers busy"}

        # Free APIs FIRST -> Local LLM (`local-qwen` on :8081/:11441) as the always-on fallback
        # when free APIs rate-limit, cool down, or are busy.
        def _rank(a):
            kind = str(a.get("kind") or "")
            if kind == "nvidia":
                tier = 0
            elif kind == "gemini":
                tier = 1
            elif kind == "opencode":
                tier = 2
            elif kind in ("tool", "blender", "unity", "shared"):
                tier = 3
            elif kind == "master":
                tier = 4
            elif kind in ("local", "llm"):
                tier = 9  # Always-on local fallback when free APIs limit out or are busy
            else:
                tier = 5
            return (tier, a.get("priority", 50))
        agent = sorted(candidates, key=_rank)[0]
        job["agent"] = agent["id"]
        job["agent_name"] = agent["name"]
        job["status"] = "working"
        job["started"] = _now()
        job["finished"] = None
        job["error"] = ""
        job["attempts"] = job.get("attempts", 0) + 1
        agent["current_job"] = job_id
        agent["status"] = "busy"
        save_agents([a if a["id"] != agent["id"] else agent for a in agents])
        save_jobs(jobs)
    threading.Thread(target=run_job, args=(job_id,), daemon=True).start()
    return {"ok": True, "job": job, "agent": agent}


def create_job(project: str, project_path: str, title: str, brief: str, skill: str,
               agent_id: str = "", auto: bool = True, role: str = "", stage: str = "",
               context: str = "", gate: str = "", task: str = "") -> dict:
    skill = normalize_skill(skill)
    job = {
        "id": "JOB-" + uuid.uuid4().hex[:8].upper(),
        "project": project, "project_path": project_path,
        "title": title, "brief": brief, "skill": skill, "role": role, "stage": stage,
        "context": context, "gate": gate,
        "status": "queued", "agent": None, "agent_name": None,
        "created": _now(), "started": None, "finished": None,
        "elapsed": None, "attempts": 0, "result": "", "error": "",
        "master": "pending", "evidence": [], "requested_agent": "", "task": task or "",
        "task_applied": False,
    }
    with LOCK:
        jobs = load_jobs()
        jobs.insert(0, job)
        save_jobs(jobs)
    if agent_id:
        job["requested_agent"] = agent_id
    if auto:
        res = dispatch(job["id"], agent_id or None)
        if res.get("ok"):
            job = res["job"]
            if agent_id:
                job["requested_agent"] = agent_id
        elif agent_id:
            # The caller asked for a specific worker. Rerouting silently is how a job lands on
            # OpenCode when Gemini was selected - the operator must SEE the mismatch.
            job["error"] = f"requested worker not used: {agent_id} - {res.get('error', 'unavailable')}"
            job["status"] = "queued"
            with LOCK:
                jobs = load_jobs()
                for i, j in enumerate(jobs):
                    if j["id"] == job["id"]:
                        jobs[i] = job
                        break
                save_jobs(jobs)
    return job


def list_jobs() -> list[dict]:
    return load_jobs()


def approve(job_id: str, verdict: str = "accepted", note: str = "") -> dict:
    with LOCK:
        jobs = load_jobs()
        job = next((j for j in jobs if j["id"] == job_id), None)
        if not job:
            return {"error": "job not found"}
        if verdict == "accepted":
            job["status"] = "done"
            job["master"] = "accepted"
        elif verdict == "rework":
            job["status"] = "rework"
            job["master"] = "rework"
            job["brief"] = job.get("brief", "") + "\nMASTER REWORK:\n" + note
        else:
            return {"error": "verdict must be accepted or rework"}
        if note:
            job.setdefault("evidence", []).append(note)
        save_jobs(jobs)
        reconcile_agents(load_agents())
        return {"ok": True, "job": job}


def retry(job_id: str, agent_id: str | None = None) -> dict:
    with LOCK:
        jobs = load_jobs()
        job = next((j for j in jobs if j["id"] == job_id), None)
        if not job:
            return {"error": "job not found"}
        job["status"] = "queued"
        job["error"] = ""
        save_jobs(jobs)
    return dispatch(job_id, agent_id)


def _ts(v) -> float:
    """Timestamps arrive as epoch floats, but a hand-edited or imported job board can carry an ISO
    string. Comparing the two raises TypeError and takes the whole dispatcher panel down with it."""
    if isinstance(v, (int, float)):
        return float(v)
    if isinstance(v, str) and v:
        try:
            return float(v)
        except ValueError:
            try:
                import datetime as _dt
                return _dt.datetime.fromisoformat(v.replace("Z", "+00:00")).timestamp()
            except Exception:
                return 0.0
    return 0.0


def reconcile_agents(agents: list[dict]) -> list[dict]:
    """Worker stats are derived from the job board, never guessed."""
    jobs = load_jobs()
    for a in agents:
        related = [j for j in jobs if j.get("agent") == a.get("id")]
        done = [j for j in related if j.get("status") == "done"]
        returned = [j for j in related if j.get("status") == "returned"]
        failed = [j for j in related if j.get("status") in ("failed", "timeout")]
        working = [j for j in related if j.get("status") == "working"]
        st = a.setdefault("stats", {"done": 0, "failed": 0, "total_seconds": 0, "last_result": ""})
        st["done"] = len(done) + len(returned)
        st["failed"] = len(failed)
        st["total_seconds"] = round(sum(float(j.get("elapsed") or 0) for j in done + returned), 1)
        if related:
            latest = max(related, key=lambda j: _ts(j.get("finished") or j.get("started") or j.get("created")))
            st["last_result"] = latest.get("status", "")
        a["current_job"] = working[0]["id"] if working else None
        if working:
            a["status"] = "busy"
            a["detail"] = "working on " + working[0]["id"]
    save_agents(agents)
    return agents


def state() -> dict:
    agents = reconcile_agents(refresh_agents())
    jobs = list_jobs()
    counts = {}
    for j in jobs:
        counts[j["status"]] = counts.get(j["status"], 0) + 1
    return {
        "master": next((a for a in agents if a["id"] == "hermes-master"), None),
        "agents": agents,
        "jobs": jobs,
        "counts": counts,
        "linked": sum(1 for a in agents if a.get("status") == "ready" and a.get("dispatchable")),
        "standby": sum(1 for a in agents if a.get("status") == "standby"),
        "offline": sum(1 for a in agents if a.get("status") == "offline"),
        "generated": _now(),
        "chatrtx": next((a for a in agents if a["id"] == "chatrtx-ui"), None),
    }
