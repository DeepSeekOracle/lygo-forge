"""Tool capability registry for Forge."""
from __future__ import annotations

TOOLS = {
    "unity-build": {
        "name": "Unity Player Build",
        "adapter": "unity-cli-build",
        "capabilities": ["unity.build.windows", "unity.build.webgl", "release.build"],
        "limits": "Needs the project's build method or a Unity 6 Build Profile; no store upload.",
        "test": False,
    },
    "triposr-local": {
        "name": "TripoSR Image-to-3D",
        "adapter": "triposr-cpu",
        "capabilities": ["3d.image_to_mesh", "3d.base_mesh", "asset.ingest"],
        "limits": "Unrigged base mesh; CPU-first. Rig/retarget is a separate Blender/Mixamo stage.",
        "test": False,
    },
    "audio-piper": {
        "name": "Piper Audio Batch",
        "adapter": "piper+forge-synth",
        "capabilities": ["audio.tts", "audio.sfx", "audio.validate"],
        "limits": "Allowlisted voices/presets only; mono 22.05 kHz WAV; no vocals/music claims.",
        "test": True,
    },
    "playtest-web": {
        "name": "Forge Web Playtest",
        "adapter": "playwright",
        "capabilities": ["qa.playtest.web", "qa.screenshot", "qa.fps"],
        "limits": "Browser only; does not prove gameplay feel or native builds.",
        "test": False,
    },
    "release-pack": {
        "name": "Forge Release Packager",
        "adapter": "zip-manifest",
        "capabilities": ["release.zip", "release.manifest", "release.credits"],
        "limits": "Unsigned ZIP; no store upload and no code signing certificate.",
        "test": False,
    },
    "pdhowler": {
        "name": "PD Howler 11",
        "adapter": "imagemagick-convert",
        "capabilities": ["image.convert", "image.resize", "image.gradient"],
        "limits": "GUI painting is not automatable; convert.exe only.",
        "test": True,
    },
    "rpgmaker-mv": {
        "name": "RPG Maker MV",
        "adapter": "project-validator",
        "capabilities": ["rpgmaker.project.validate", "rpgmaker.data.inspect", "rpgmaker.event.create", "rpgmaker.rollback"],
        "limits": "Read-only JSON inspection; no map/event authoring yet.",
        "test": True,
    },
    "tyranobuilder": {
        "name": "TyranoBuilder",
        "adapter": None,
        "capabilities": [],
        "limits": "Electron GUI; no supported headless project interface found.",
        "test": False,
    },
    "rpgmaker-vxace": {
        "name": "RPG Maker VX Ace",
        "adapter": None,
        "capabilities": [],
        "limits": "GUI editor; project format adapter not wired.",
        "test": False,
    },
    "rytmik-studio": {
        "name": "Rytmik Studio",
        "adapter": None,
        "capabilities": [],
        "limits": "Unity GUI; no supported headless CLI.",
        "test": False,
    },
    "rytmik-ultimate": {
        "name": "Rytmik Ultimate",
        "adapter": None,
        "capabilities": [],
        "limits": "Unity GUI; no supported headless CLI.",
        "test": False,
    },
}


def describe(agent: dict) -> dict:
    meta = TOOLS.get(agent.get("id"), {})
    return {
        "id": agent.get("id"),
        "name": agent.get("name"),
        "status": agent.get("status"),
        "path": agent.get("path"),
        "adapter": meta.get("adapter"),
        "capabilities": meta.get("capabilities", []),
        "limits": meta.get("limits", ""),
        "testable": meta.get("test", False),
    }


def all_tools(agents: list[dict]) -> list[dict]:
    return [describe(a) for a in agents if a.get("kind") == "tool"]
