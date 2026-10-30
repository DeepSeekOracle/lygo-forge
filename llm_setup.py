"""Shipped brain for LYGO Forge.

QwenPaw is the basic model Forge ships with. On startup Forge looks for a
local OpenAI-compatible server on this PC. A saved API key is the other way
to run. Nothing here prints or returns a key.
"""
from __future__ import annotations

import json
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.parse import urlparse

BASIC_NAME = "LYGO Engine"
BASIC_MODEL = "Qwen3-4B-Instruct-2507"
# The anchor is the console's engine on 11441, reached through the local bridge on 8081.
# 8080 was the old QwenPaw port and is retired (see docs/MODELS.md).
BASIC_ENDPOINT = "http://127.0.0.1:8081/v1"

# Loopback servers a Forge install may already have. The shared engine is first.
PROBE_ENDPOINTS = (
    ("LYGO Engine", BASIC_ENDPOINT),
    ("llama-server", "http://127.0.0.1:11441/v1"),
    ("NVIDIA bridge", "http://127.0.0.1:8082/v1"),
    ("Ollama", "http://127.0.0.1:11434/v1"),
    ("QwenPaw (retired)", "http://127.0.0.1:8080/v1"),
)

API_PROVIDERS = ("openai", "openrouter", "anthropic", "xai", "custom")
UPGRADE_DOC = "docs/LLM.md"


def settings_file(data_home: Path) -> Path:
    return Path(data_home) / "llm.json"


def key_file(data_home: Path) -> Path:
    return Path(data_home) / "llm-key.txt"


def key_is_set(data_home: Path) -> bool:
    path = key_file(data_home)
    if not path.exists():
        return False
    try:
        return bool(path.read_text(encoding="utf-8").strip())
    except OSError:
        return False


def read_key(data_home: Path) -> str:
    path = key_file(data_home)
    if not path.exists():
        return ""
    try:
        return path.read_text(encoding="utf-8").strip()
    except OSError:
        return ""


def write_key(data_home: Path, key: str) -> None:
    text = (key or "").strip()
    path = key_file(data_home)
    if not text:
        path.unlink(missing_ok=True)
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text + "\n", encoding="utf-8")


def is_loopback(url: str) -> bool:
    try:
        host = (urlparse(url).hostname or "").lower()
    except ValueError:
        return False
    return host in {"127.0.0.1", "localhost", "::1"}


def _load_saved(data_home: Path) -> dict:
    path = settings_file(data_home)
    if not path.exists():
        return {}
    try:
        data = json.loads(path.read_text(encoding="utf-8-sig"))
    except (OSError, json.JSONDecodeError):
        return {}
    return data if isinstance(data, dict) else {}


def save_settings(data_home: Path, settings: dict) -> None:
    path = settings_file(data_home)
    path.parent.mkdir(parents=True, exist_ok=True)
    clean = {k: v for k, v in settings.items() if k != "api_key"}
    path.write_text(json.dumps(clean, indent=2) + "\n", encoding="utf-8")


def list_models(base: str, timeout: float = 2.0) -> list[str]:
    if not is_loopback(base):
        return []
    url = base.rstrip("/") + "/models"
    req = urllib.request.Request(url, headers={"Authorization": "Bearer local"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as response:
            payload = json.loads(response.read().decode("utf-8", "replace"))
    except Exception:
        return []
    rows = payload.get("data") if isinstance(payload, dict) else None
    if not isinstance(rows, list):
        return []
    names = []
    for row in rows:
        if isinstance(row, dict) and row.get("id"):
            names.append(str(row["id"]))
        elif isinstance(row, str):
            names.append(row)
    return names


def probe_local(endpoints=PROBE_ENDPOINTS, timeout: float = 0.8) -> list[dict]:
    pairs = list(endpoints)

    def one(item: tuple[str, str]) -> dict | None:
        label, base = item
        models = list_models(base, timeout=timeout)
        if not models:
            return None
        return {"label": label, "endpoint": base.rstrip("/"), "models": models}

    with ThreadPoolExecutor(max_workers=max(1, len(pairs))) as pool:
        hits = list(pool.map(one, pairs))
    return [hit for hit in hits if hit]


def _is_basic(model: str) -> bool:
    m = (model or "").lower()
    # the anchor is the shipped default now; qwenpaw is the legacy name
    return m == BASIC_MODEL.lower() or "qwenpaw" in m


def _local_choice(hit: dict, model: str, tier: str) -> dict:
    return {
        "ready": True,
        "mode": "local",
        "provider": "custom",
        "endpoint": hit["endpoint"],
        "model": model,
        "label": BASIC_NAME if _is_basic(model) else hit["label"],
        "tier": "basic" if _is_basic(model) else tier,
        "shipped": _is_basic(model),
        "key_set": False,
        "upgrade_doc": UPGRADE_DOC,
    }


def choose_brain(found: list[dict], saved: dict, key_set: bool) -> dict:
    """Pick QwenPaw when it is up, otherwise a saved upgrade or another local server."""
    offline = {
        "ready": False,
        "mode": "offline",
        "provider": "custom",
        "endpoint": BASIC_ENDPOINT,
        "model": BASIC_MODEL,
        "label": BASIC_NAME,
        "tier": "basic",
        "shipped": True,
        "key_set": key_set,
        "upgrade_doc": UPGRADE_DOC,
        "hint": "The LYGO Engine (Qwen3-4B-Instruct-2507 on 11441) is not answering. Start LYGO Agent Manager first - it boots the engine. See docs/MODELS.md.",
    }
    mode = str(saved.get("mode") or "")
    if mode == "api" and key_set and str(saved.get("model") or "").strip():
        provider = str(saved.get("provider") or "openai").lower()
        if provider not in API_PROVIDERS:
            provider = "openai"
        return {
            "ready": True,
            "mode": "api",
            "provider": provider,
            "endpoint": str(saved.get("endpoint") or ""),
            "model": str(saved["model"]).strip(),
            "label": str(saved.get("label") or provider),
            "tier": "upgraded",
            "shipped": False,
            "key_set": True,
            "upgrade_doc": UPGRADE_DOC,
        }
    saved_endpoint = str(saved.get("endpoint") or "").rstrip("/")
    saved_model = str(saved.get("model") or "").strip()
    if mode == "local" and saved_endpoint and saved_model:
        for hit in found:
            if hit["endpoint"] == saved_endpoint and saved_model in hit["models"]:
                return _local_choice(hit, saved_model, "upgraded")
    local = [hit for hit in found if hit.get("label") != "NVIDIA bridge"]
    nvidia = [hit for hit in found if hit.get("label") == "NVIDIA bridge"]
    fallback_local = None
    for hit in local:
        for model in hit["models"]:
            if _is_basic(model):
                fallback_local = _local_choice(hit, model, "basic")
                break
        if fallback_local:
            break
    # Free API bridge (8082) takes priority when online; shared local engine (8081 -> 11441) is the always-on fallback.
    if nvidia and nvidia[0].get("models"):
        nv_hit = nvidia[0]
        nv_model = nv_hit["models"][0]
        choice = {
            "ready": True,
            "mode": "local",
            "provider": "custom",
            "endpoint": nv_hit["endpoint"],
            "model": nv_model,
            "label": "NVIDIA Free Bridge",
            "tier": "free-api",
            "shipped": False,
            "key_set": True,
            "upgrade_doc": UPGRADE_DOC,
            "hint": "Primary brain: NVIDIA Free API Bridge (8082) with automatic fallback to LYGO Engine (8081 -> 11441).",
        }
        if fallback_local:
            choice["fallback"] = {
                "endpoint": fallback_local["endpoint"],
                "model": fallback_local["model"],
                "label": fallback_local["label"],
            }
        return choice
    if fallback_local:
        return fallback_local
    for hit in local:
        for model in hit["models"]:
            if "coder" in model.lower():
                choice = _local_choice(hit, model, "coder")
                choice["shipped"] = False
                choice["hint"] = (
                    "The anchor (Qwen3-4B-Instruct-2507) is not answering, so Forge is using the local coder it found. "
                    "Start LYGO Agent Manager to bring the anchor up. See docs/MODELS.md."
                )
                return choice
    if found:
        offline["hint"] = (
            "A bridge answered but it is not the anchor model (Qwen3-4B-Instruct-2507). "
            "Start LYGO Agent Manager, pin a local model from the Brain card, or add an API key. See docs/MODELS.md."
        )
    return offline


def resolve(data_home: Path, timeout: float = 2.0) -> dict:
    return choose_brain(probe_local(timeout=timeout), _load_saved(data_home), key_is_set(data_home))


def public_view(brain: dict) -> dict:
    """Status for the browser. No key, no auth header."""
    view = {k: v for k, v in brain.items() if k not in {"hint", "api_key"}}
    view["hint"] = brain.get("hint") or (
        "Default local brain: LYGO Engine Qwen3-4B-Instruct-2507 (11441). An API key takes priority when present."
        if brain.get("tier") == "basic" else
        "This brain is an upgrade over the anchor. Notes: docs/MODELS.md."
    )
    return view


def apply_choice(data_home: Path, payload: dict) -> dict:
    """Save an upgrade. A key is stored beside the settings and never echoed."""
    mode = str(payload.get("mode") or "").strip().lower()
    if mode == "api":
        provider = str(payload.get("provider") or "openai").strip().lower()
        model = str(payload.get("model") or "").strip()
        endpoint = str(payload.get("endpoint") or "").strip()
        if provider not in API_PROVIDERS:
            raise ValueError("provider must be openai, openrouter, anthropic, xai, or custom")
        if not model:
            raise ValueError("model id required")
        if provider == "custom":
            if not endpoint.startswith("https://"):
                raise ValueError("custom API base URL must be https")
        elif endpoint and not endpoint.startswith("https://"):
            raise ValueError("API base URL must be https")
        key = str(payload.get("api_key") or "")
        if key.strip():
            write_key(data_home, key)
        elif not key_is_set(data_home):
            raise ValueError("API key required")
        save_settings(data_home, {
            "mode": "api",
            "provider": provider,
            "model": model,
            "endpoint": endpoint,
            "label": provider,
        })
    elif mode == "local":
        endpoint = str(payload.get("endpoint") or "").strip().rstrip("/")
        model = str(payload.get("model") or "").strip()
        if not is_loopback(endpoint):
            raise ValueError("local model URL must be on this PC (127.0.0.1 or localhost)")
        models = list_models(endpoint)
        if model not in models:
            raise ValueError("that model is not served on this PC")
        save_settings(data_home, {
            "mode": "local",
            "provider": "custom",
            "endpoint": endpoint,
            "model": model,
            "label": BASIC_NAME if _is_basic(model) else "Local",
        })
    elif mode == "clear":
        settings_file(data_home).unlink(missing_ok=True)
        write_key(data_home, "")
    else:
        raise ValueError("mode must be local, api, or clear")
    return public_view(resolve(data_home))
