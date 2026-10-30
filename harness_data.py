"""LYGO Forge harness data and project bootstrap.

This is LYGO's own implementation of a phase-gated game development harness.
It adapts process ideas from BMad Method / BMad Game Dev Studio (MIT) and
GitHub Spec Kit (MIT), and uses an independent task graph rather than copying
Taskmaster (MIT with Commons Clause).

Every project is a set of explicit artifacts plus a dependency-aware task graph.
The agent prompt is generated from the current task, profile, phase and role so
the model cannot silently redefine the project.
"""
from __future__ import annotations

import json
import re
import time
from pathlib import Path

# ---------------------------------------------------------------------------
# Engine / presentation profiles
# ---------------------------------------------------------------------------

LOW_END_BUDGETS = {
    "web": {
        "target_fps": 60,
        "resolution": "1280x720",
        "draw_calls": 90,
        "triangles": 150000,
        "texture_mb": 96,
        "audio_mb": 12,
        "js_bundle_kb": 900,
        "rule": "One renderer, one scene, no realtime post chain on the low preset."
    },
    "unity": {
        "target_fps": 60,
        "resolution": "1280x720",
        "draw_calls": 140,
        "triangles": 300000,
        "texture_mb": 192,
        "audio_mb": 24,
        "rule": "Baked lighting, one shadow-casting directional light, no realtime GI."
    },
}

PROFILES = {
    "web-2d": {
        "label": "Web 2D",
        "family": "web",
        "mode": "2D",
        "engine": "Canvas 2D or Phaser/PixiJS",
        "summary": "Orthogonal tiles, sprite animation, crisp pixel or HD vector art.",
        "starter": "web",
        "budget": LOW_END_BUDGETS["web"],
        "specialists": ["game-director", "game-designer", "level-designer", "art-director", "web-engineer", "qa-lead", "audio-designer", "asset-scout"],
        "skills": ["game-design", "2d", "web", "asset-sourcing", "low-end", "qa"],
        "checks": [
            "fixed logical resolution and camera snap",
            "sprite atlas <= 2048 and no per-frame image allocation",
            "input works on keyboard, pointer and touch",
            "first playable interaction in under 10 seconds",
        ],
    },
    "web-2.5d": {
        "label": "Web 2.5D",
        "family": "web",
        "mode": "2.5D",
        "engine": "Three.js with a constrained camera",
        "summary": "2D gameplay on a 3D stage: depth sorting, parallax, billboards.",
        "starter": "web",
        "budget": LOW_END_BUDGETS["web"],
        "specialists": ["game-director", "game-designer", "level-designer", "art-director", "technical-artist", "web-engineer", "qa-lead", "asset-scout"],
        "skills": ["game-design", "2.5d", "web", "asset-sourcing", "low-end", "qa"],
        "checks": [
            "all gameplay decisions happen on a readable 2D plane",
            "depth sorting is stable; no z-fighting at camera extremes",
            "one camera path and one lighting mood per level",
            "sprites and environment share one art direction",
        ],
    },
    "web-hd2d": {
        "label": "Web HD-2D",
        "family": "web",
        "mode": "HD-2D",
        "engine": "Three.js: 2D sprites in a lit 3D diorama",
        "summary": "HD-2D look: sprite characters, 3D sets, depth of field, light and bloom.",
        "starter": "web",
        "budget": LOW_END_BUDGETS["web"],
        "specialists": ["game-director", "game-designer", "level-designer", "art-director", "technical-artist", "web-engineer", "qa-lead", "asset-scout"],
        "skills": ["game-design", "hd2d", "web", "asset-sourcing", "low-end", "qa"],
        "checks": [
            "sprites read against the 3D set at gameplay camera distance",
            "post stack has a low preset: no DOF, no bloom, 1x pixel ratio",
            "silhouettes and contrast carry the scene before post effects",
            "one camera pitch and one focal treatment per act",
        ],
    },
    "web-3d": {
        "label": "Web 3D",
        "family": "web",
        "mode": "3D",
        "engine": "Three.js",
        "summary": "Real-time 3D, modular kits, LOD and aggressive batching.",
        "starter": "web",
        "budget": LOW_END_BUDGETS["web"],
        "specialists": ["game-director", "game-designer", "level-designer", "art-director", "technical-artist", "web-engineer", "qa-lead", "asset-scout"],
        "skills": ["game-design", "3d", "web", "asset-sourcing", "low-end", "qa"],
        "checks": [
            "draw calls under budget and merged static geometry",
            "LODs or culling on every repeated prop",
            "one shadow-casting light and baked ambient",
            "no full-screen post on the low preset",
        ],
    },
    "unity-2d": {
        "label": "Unity 2D",
        "family": "unity",
        "mode": "2D",
        "engine": "Unity 6 URP 2D",
        "summary": "Sprite renderers, tilemaps, 2D lights, low-end WebGL/desktop target.",
        "starter": None,
        "budget": LOW_END_BUDGETS["unity"],
        "specialists": ["game-director", "game-designer", "level-designer", "art-director", "unity-engineer", "qa-lead", "audio-designer", "asset-scout"],
        "skills": ["game-design", "2d", "unity", "asset-sourcing", "low-end", "qa"],
        "checks": [
            "sprite atlas and compression set before content scale",
            "URP 2D renderer with one shadow/light budget",
            "input and UI scale at 1280x720 and 1920x1080",
            "WebGL build size and memory checked",
        ],
    },
    "unity-2.5d": {
        "label": "Unity 2.5D",
        "family": "unity",
        "mode": "2.5D",
        "engine": "Unity 6 URP, 2D gameplay in 3D",
        "summary": "Side-on or angled gameplay over 3D sets with depth sorting.",
        "starter": None,
        "budget": LOW_END_BUDGETS["unity"],
        "specialists": ["game-director", "game-designer", "level-designer", "art-director", "technical-artist", "unity-engineer", "qa-lead", "asset-scout"],
        "skills": ["game-design", "2.5d", "unity", "asset-sourcing", "low-end", "qa"],
        "checks": [
            "sorting layers and transparent queue are explicit",
            "camera is constrained to the gameplay plane",
            "one shadow light, mixed lighting, no realtime GI",
            "physics and input work at the low-end frame rate",
        ],
    },
    "unity-hd2d": {
        "label": "Unity HD-2D",
        "family": "unity",
        "mode": "HD-2D",
        "engine": "Unity 6 URP: 2D sprites in a lit 3D diorama",
        "summary": "Octopath-style presentation with strict low-end fallbacks.",
        "starter": None,
        "budget": LOW_END_BUDGETS["unity"],
        "specialists": ["game-director", "game-designer", "level-designer", "art-director", "technical-artist", "unity-engineer", "qa-lead", "asset-scout"],
        "skills": ["game-design", "hd2d", "unity", "asset-sourcing", "low-end", "qa"],
        "checks": [
            "sprite resolution and 3D set scale agree",
            "post volume has a low preset: DOF/bloom off, 1x render scale",
            "sorting, transparency and shadows are deliberate",
            "art bible defines silhouettes, palette and light temperature",
        ],
    },
    "unity-3d": {
        "label": "Unity 3D",
        "family": "unity",
        "mode": "3D",
        "engine": "Unity 6 URP 3D",
        "summary": "Low-end 3D: modular kits, LOD, baked light, WebGL or desktop.",
        "starter": None,
        "budget": LOW_END_BUDGETS["unity"],
        "specialists": ["game-director", "game-designer", "level-designer", "art-director", "technical-artist", "unity-engineer", "qa-lead", "asset-scout"],
        "skills": ["game-design", "3d", "unity", "asset-sourcing", "low-end", "qa"],
        "checks": [
            "static batching, LOD and occlusion before content scale",
            "one shadow light and baked ambient",
            "texture and mesh budgets checked in the build",
            "WebGL memory and build time measured",
        ],
    },
}

# Every profile needs the owners used by the shared task graph.
_COMMON_SPECIALISTS = ["producer", "systems-designer", "narrative-designer", "audio-designer", "performance-engineer"]
for _profile in PROFILES.values():
    _profile["specialists"] = list(dict.fromkeys(_COMMON_SPECIALISTS + _profile["specialists"]))

# ---------------------------------------------------------------------------
# Phases and artifact gates
# ---------------------------------------------------------------------------

PHASES = [
    {"id": "intake", "title": "Intake", "goal": "Lock the brief, platform, audience, scope and non-goals.", "owner": "producer", "artifacts": ["GAME.md"], "gate": "Brief accepted; scope and non-goals explicit."},
    {"id": "concept", "title": "Concept", "goal": "Find the loop, pillars, references and the smallest convincing slice.", "owner": "game-director", "artifacts": ["GAME.md", "DECISIONS.md"], "gate": "Loop and pillars survive a one-page review."},
    {"id": "gdd", "title": "Design", "goal": "Write the GDD, systems, progression, content plan and whitepaper.", "owner": "game-designer", "artifacts": ["GDD.md", "WHITEPAPER.md", "DECISIONS.md"], "gate": "GDD has no placeholders in core systems."},
    {"id": "art", "title": "Art Bible", "goal": "Define look, palette, silhouettes, asset list, sources and licenses.", "owner": "art-director", "artifacts": ["ART_BIBLE.md", "ASSET_PLAN.md"], "gate": "Every asset has a source/licence/status row."},
    {"id": "tech", "title": "Technical Plan", "goal": "Choose architecture, data, tools and a low-end performance budget.", "owner": "technical-artist", "artifacts": ["TECH_SPEC.md", "PLAN.md"], "gate": "Architecture, budgets and test hooks are explicit."},
    {"id": "slice", "title": "Vertical Slice", "goal": "Make one polished playable slice that proves the loop.", "owner": "game-designer", "artifacts": ["QA.md", "DECISIONS.md"], "gate": "Slice runs clean and a stranger can play it."},
    {"id": "production", "title": "Production", "goal": "Build content in tasks, not broad rewrites.", "owner": "producer", "artifacts": ["PLAN.md", "TASKS.json", "DECISIONS.md"], "gate": "Every feature has a task, acceptance and evidence."},
    {"id": "qa", "title": "QA", "goal": "Test correctness, performance, accessibility and the low-end preset.", "owner": "qa-lead", "artifacts": ["QA.md"], "gate": "No blocker; measured performance inside budget."},
    {"id": "release", "title": "Release", "goal": "Package, credit, verify and hand over a reproducible build.", "owner": "producer", "artifacts": ["PLAN.md", "QA.md", "DECISIONS.md"], "gate": "Build reproducible; licences and credits complete."},
]

SPECIALISTS = {
    "producer": {
        "name": "Producer",
        "mission": "Protect scope, sequence work, maintain the plan and refuse uncontrolled expansion.",
        "inputs": ["GAME.md", "PLAN.md", "TASKS.json"],
        "outputs": ["PLAN.md", "TASKS.json", "DECISIONS.md"],
        "rules": ["One task at a time.", "No new feature without a task, acceptance and evidence.", "Keep non-goals visible."],
    },
    "game-director": {
        "name": "Game Director",
        "mission": "Hold the vision, pillars, references and the player promise.",
        "inputs": ["GAME.md", "GDD.md", "ART_BIBLE.md"],
        "outputs": ["GAME.md", "DECISIONS.md"],
        "rules": ["Every decision ties to a pillar.", "Reference games are comparison, never copying.", "Cut scope before weakening the core loop."],
    },
    "game-designer": {
        "name": "Game Designer",
        "mission": "Design verbs, loops, systems, progression, balance and onboarding.",
        "inputs": ["GAME.md", "GDD.md"],
        "outputs": ["GDD.md", "DECISIONS.md"],
        "rules": ["Define the loop in verbs, not adjectives.", "Every number has a reason and a test.", "Design for the first 30 seconds and the 30th minute."],
    },
    "systems-designer": {
        "name": "Systems Designer",
        "mission": "Make economies, progression and combat math legible and testable.",
        "inputs": ["GDD.md", "TECH_SPEC.md"],
        "outputs": ["GDD.md", "TECH_SPEC.md"],
        "rules": ["Show formulas and ranges.", "No invisible catch-up systems.", "Balance changes require a test case."],
    },
    "level-designer": {
        "name": "Level Designer",
        "mission": "Build readable spaces, encounter pacing and teaching without text.",
        "inputs": ["GDD.md", "ART_BIBLE.md"],
        "outputs": ["GDD.md", "ASSET_PLAN.md"],
        "rules": ["Teach one verb per space.", "Every arena has a landmark and an exit read.", "Blockout before art."],
    },
    "narrative-designer": {
        "name": "Narrative Designer",
        "mission": "Make story, characters and barks serve playable fantasy.",
        "inputs": ["GAME.md", "GDD.md"],
        "outputs": ["GDD.md", "ART_BIBLE.md"],
        "rules": ["Dialogue is short, characterful and skippable.", "No lore dump blocks play.", "Keep a canon sheet."],
    },
    "art-director": {
        "name": "Art Director",
        "mission": "Define a coherent, producible look that a small team can ship.",
        "inputs": ["GAME.md", "GDD.md"],
        "outputs": ["ART_BIBLE.md", "ASSET_PLAN.md"],
        "rules": ["Silhouette, palette and light before detail.", "Every asset has a reuse path.", "No unlicensed reference in the build."],
    },
    "technical-artist": {
        "name": "Technical Artist",
        "mission": "Turn the look into a pipeline and keep it inside low-end budgets.",
        "inputs": ["ART_BIBLE.md", "TECH_SPEC.md"],
        "outputs": ["TECH_SPEC.md", "ASSET_PLAN.md", "QA.md"],
        "rules": ["Measure draw calls, memory and build size.", "Every effect needs a low preset.", "Prefer baked, merged and instanced."],
    },
    "web-engineer": {
        "name": "Web Engineer",
        "mission": "Build the browser game with clean state, input, audio and performance.",
        "inputs": ["TECH_SPEC.md", "GDD.md"],
        "outputs": ["src/", "QA.md"],
        "rules": ["No network dependency unless specified.", "One game loop and one source of truth.", "Test in a browser, not only by reading code."],
    },
    "unity-engineer": {
        "name": "Unity Engineer",
        "mission": "Build and verify the Unity project, scenes, systems and build settings.",
        "inputs": ["TECH_SPEC.md", "GDD.md"],
        "outputs": ["Assets/", "ProjectSettings/", "QA.md"],
        "rules": ["Use the installed Unity version.", "Prefabs and ScriptableObjects over scene spaghetti.", "Build or test before claiming done."],
    },
    "qa-lead": {
        "name": "QA Lead",
        "mission": "Prove the game works on the target machine and the low-end preset.",
        "inputs": ["GAME.md", "TECH_SPEC.md", "QA.md"],
        "outputs": ["QA.md", "DECISIONS.md"],
        "rules": ["A 200 response is not a test.", "Record machine, resolution and result.", "A blocker stops release."],
    },
    "audio-designer": {
        "name": "Audio Designer",
        "mission": "Design and source audio that supports feedback and mood without bloat.",
        "inputs": ["GDD.md", "ART_BIBLE.md"],
        "outputs": ["ASSET_PLAN.md", "QA.md"],
        "rules": ["Every sound has a gameplay reason.", "Licence and loop points recorded.", "Respect autoplay policies."],
    },
    "asset-scout": {
        "name": "Asset Scout",
        "mission": "Find, licence, validate and document the best local/CC0 asset for the job.",
        "inputs": ["ART_BIBLE.md", "ASSET_PLAN.md"],
        "outputs": ["ASSET_PLAN.md", "ASSET_INDEX.json"],
        "rules": ["CC0 or explicit compatible licence only.", "Record source URL, licence and hash.", "Prefer local reuse before download."],
    },
    "performance-engineer": {
        "name": "Low-End Performance Engineer",
        "mission": "Keep the game inside the profile budget on low-end hardware.",
        "inputs": ["TECH_SPEC.md", "QA.md"],
        "outputs": ["TECH_SPEC.md", "QA.md"],
        "rules": ["Measure before optimizing.", "Low preset ships first.", "Budget failures are defects."],
    },
}

# ---------------------------------------------------------------------------
# Task seeds by phase
# ---------------------------------------------------------------------------

TASK_SEEDS = {
    "intake": [
        ("Brief", "producer", "Write GAME.md: pitch, audience, platform, target machine, scope and non-goals.", ["GAME.md exists", "non-goals are explicit", "target hardware is named"]),
        ("Constraints", "producer", "Record time, team, engine, offline/online and low-end constraints in DECISIONS.md.", ["constraints are testable", "one low-end target is named"]),
        ("References", "game-director", "Collect 3-5 reference games/art with what to learn and what not to copy.", ["references are linked", "no asset copying"]),
    ],
    "concept": [
        ("Core Loop", "game-designer", "Define the 30-second loop, 5-minute loop and session loop in verbs.", ["three loops are explicit", "failure and reward are named"]),
        ("Pillars", "game-director", "Write three pillars and a non-goal for each.", ["pillars fit on one page", "each pillar has a test"]),
        ("Slice Scope", "producer", "Define the vertical slice: what is in, what is out, how it is tested.", ["slice is one playable scene/level", "acceptance is observable"]),
    ],
    "gdd": [
        ("GDD Core", "game-designer", "Write GDD.md: player fantasy, controls, camera, combat/loop, progression, content, UI.", ["no placeholder sections", "controls and camera are explicit"]),
        ("Numbers", "systems-designer", "Define HP, damage, speed, economy, drop rates and progression formulas.", ["formulas and ranges are shown", "one balance test is defined"]),
        ("Narrative", "narrative-designer", "Write premise, cast, barks and the story delivery rules.", ["story is skippable", "canon sheet exists"]),
    ],
    "art": [
        ("Art Bible", "art-director", "Write ART_BIBLE.md: silhouettes, palette, lighting, camera, VFX and UI language.", ["palette and lighting are explicit", "references are licensed/original"]),
        ("Asset Plan", "asset-scout", "Write ASSET_PLAN.md with every asset, source, licence, format, budget and status.", ["every row has a licence", "no unknown-source asset"]),
        ("Licence Audit", "producer", "Audit all assets and references; remove anything not compatible.", ["licence manifest complete", "credits file started"]),
    ],
    "tech": [
        ("Tech Spec", "technical-artist", "Write TECH_SPEC.md: engine, scene structure, data, input, save, audio, build and tests.", ["architecture is explicit", "test hooks are named"]),
        ("Budget", "performance-engineer", "Set measurable low-end budgets for FPS, draw calls, triangles, texture memory and build size.", ["numbers are in TECH_SPEC.md", "measurement method is named"]),
        ("Risk List", "producer", "List technical/content risks with owner and mitigation.", ["each risk has a trigger and fallback"]),
    ],
    "slice": [
        ("Core Build", "game-designer", "Implement the core loop in the slice with placeholder art.", ["input works", "loop is playable", "no console errors"]),
        ("HUD/Onboarding", "art-director", "Add readable HUD and teach controls without a manual.", ["first action is obvious", "HUD is legible at 1280x720"]),
        ("Slice Test", "qa-lead", "Run and record a full slice test; fix blockers.", ["QA.md updated", "screenshot/evidence recorded"]),
    ],
    "production": [
        ("Content Batch", "game-designer", "Build the next content batch from PLAN.md; no broad rewrites.", ["task matches plan", "acceptance met", "evidence recorded"]),
        ("Feel Pass", "game-designer", "Improve feedback, timing, camera and audio within the task scope.", ["before/after evidence", "no new scope"]),
        ("Asset Pass", "asset-scout", "Replace placeholders with licensed, budget-compliant assets.", ["ASSET_PLAN updated", "licence recorded"]),
    ],
    "qa": [
        ("Test Matrix", "qa-lead", "Write and run the desktop/browser/mobile test matrix for the low-end preset.", ["all critical paths tested", "results recorded"]),
        ("Performance", "performance-engineer", "Measure and fix budget failures on the low-end machine.", ["numbers recorded", "blockers fixed or listed"]),
        ("Playtest", "game-director", "Run a first-time-player test and log drift from the pillars.", ["notes recorded", "decisions updated"]),
    ],
    "release": [
        ("Build", "producer", "Produce a reproducible build and a run instruction.", ["build exists", "version and hash recorded"]),
        ("Credits", "producer", "Complete licences, credits and attribution.", ["third-party notices complete", "no unlicensed asset"]),
        ("Release Check", "qa-lead", "Run the release checklist and record the final verdict.", ["blockers zero", "known issues listed"]),
    ],
}

# ---------------------------------------------------------------------------
# Bootstrap
# ---------------------------------------------------------------------------

PROFILE_FILES = {
    "GAME.md": """# {name}

**Profile:** {profile_label} · **Engine:** {engine}
**Status:** intake
**Owner:** Producer

## Pitch

{summary}

## Player fantasy

_One or two sentences. What does the player get to feel or do that they cannot do elsewhere?_

## Audience and platform

- Audience:
- Platform:
- Target machine / low-end preset:
- Input:

## Pillars

1. **_** — test:
2. **_** — test:
3. **_** — test:

## Non-goals

- No multiplayer unless a task is explicitly created for it.
- No paid assets or cloud dependency without a decision record.
- No broad rewrite outside the selected task.

## Scope

- Vertical slice:
- First release:
- Not in this release:

## Success test

_One observable test that proves the game is worth continuing._
""",
    "GDD.md": """# {name} — Game Design Document

> Living document. Every section must have a real answer before the Design gate.

## 1. Player fantasy

## 2. Controls and camera

## 3. Core loop

- 30 seconds:
- 5 minutes:
- session:

## 4. Verbs and systems

## 5. Combat / interaction

## 6. Progression and economy

## 7. Content and levels

## 8. UI / HUD / onboarding

## 9. Audio and feedback

## 10. Accessibility

## 11. Balance numbers

## 12. Test cases
""",
    "ART_BIBLE.md": """# {name} — Art Bible

## Look in one sentence

## Silhouette and shape language

## Palette

| Role | Hex | Use |
|---|---|---|
| Background | | |
| Midground | | |
| Focal | | |
| UI | | |
| Warning | | |

## Lighting and atmosphere

## Camera and composition

## Character / prop rules

## VFX rules

## UI language

## Low-end fallback

## References and licence notes
""",
    "TECH_SPEC.md": """# {name} — Technical Spec

**Profile:** {profile_label}
**Engine:** {engine}

## Architecture

## Scene / module structure

## Data and save format

## Input

## Audio

## Rendering and performance budget

- Target FPS: {fps}
- Resolution: {resolution}
- Draw calls: {draw_calls}
- Triangles: {triangles}
- Texture memory: {texture_mb} MB
- Audio: {audio_mb} MB
- Low preset: {rule}

## Test hooks

## Build / packaging

## Risks
""",
    "ASSET_PLAN.md": """# {name} — Asset Plan

Every asset must have a source, licence, format, budget and status. No unknown-source assets.

| ID | Asset | Type | Use | Source / licence | Format | Budget | Status |
|---|---|---|---|---|---|---|---|
| A001 | | | | | | | planned |

## Sourcing rules

- CC0 / public domain / explicitly compatible only.
- Record source URL, author, licence and SHA-256.
- Prefer local reuse and generated assets before downloads.
- Never ship a ripped or unlicensed asset.

## Generated assets

| ID | Prompt / model | Seed | Output | Verified |
|---|---|---|---|---|
""",
    "QA.md": """# {name} — QA

## Target

- Machine / browser:
- Resolution:
- Low preset:
- Build:

## Test matrix

| Area | Test | Expected | Result | Evidence |
|---|---|---|---|---|
| Boot | | | | |
| Input | | | | |
| Core loop | | | | |
| Save | | | | |
| Performance | | | | |
| Audio | | | | |
| Accessibility | | | | |

## Blockers

## Known issues
""",
    "PLAN.md": """# {name} — Plan

## Phase

intake

## Current task

- TBD

## Milestones

| Phase | Gate | State |
|---|---|---|
| Intake | brief | open |
| Concept | loop/pillars | open |
| Design | GDD | open |
| Art | bible/assets | open |
| Tech | spec/budget | open |
| Slice | playable | open |
| Production | content | open |
| QA | verified | open |
| Release | shipped | open |

## Rules

1. One task at a time.
2. Every task has acceptance and evidence.
3. No feature without a task.
4. Update DECISIONS.md when the plan changes.
""",
    "DECISIONS.md": """# {name} — Decisions

| Date | Decision | Why | Alternatives | Owner |
|---|---|---|---|---|
| {date} | Project initialized as {profile_label} | chosen engine profile | | producer |
""",
    "WHITEPAPER.md": """# {name} — Whitepaper

## Thesis

## Player promise

## Loop

## Systems and content

## Art and audio direction

## Technical approach and low-end budget

## Scope, risks and non-goals

## Milestones and evidence

## Licences and credits
""",
    "RESEARCH.md": """# {name} — Research

## References

- [BMad Game Dev Studio](https://github.com/bmad-code-org/bmad-module-game-dev-studio) — phase/artifact discipline, MIT.
- [GitHub Spec Kit](https://github.com/github/spec-kit) — constitution → spec → plan → tasks → converge, MIT.
- [Game production stages](https://kokkugames.com/what-are-the-essential-stages-of-full-cycle-game-creation/) — production framing.
- [Unity WebGL performance](https://www.gauravgo.com/blog/shipping-a-unity-game-to-the-browser-what-actually-costs-you-frames/) — browser budgets.
- [Awesome CC0](https://github.com/madjin/awesome-cc0) — public-domain asset starting point.

## Notes

Record only what changes a decision. Link the source.
""",
    "HARNESS.md": """# {name} — Forge Harness

This project is driven by LYGO Forge v0.2.

## Read order

1. `GAME.md` — the brief, pillars and non-goals.
2. `PLAN.md` — current phase and milestones.
3. `TASKS.json` — the only allowed work queue.
4. `GDD.md` — design truth.
5. `ART_BIBLE.md` and `ASSET_PLAN.md` — look and licences.
6. `TECH_SPEC.md` — architecture and low-end budget.
7. `QA.md` — evidence.

## Hard rails

- Work only on the selected task.
- Do not invent scope, assets or an engine change.
- Update the owning artifact and the task evidence.
- If blocked, stop and write the blocker rather than guessing.
- No paid services, no unlicensed assets, no store/credits.
""",
}


def _phase_tasks(profile_id: str) -> list[dict]:
    profile = PROFILES[profile_id]
    tasks = []
    for phase in PHASES:
        phase_id = phase["id"]
        for index, (title, owner, description, acceptance) in enumerate(TASK_SEEDS[phase_id], start=1):
            tasks.append({
                "id": f"{phase_id.upper()}-{index:02d}",
                "phase": phase_id,
                "title": title,
                "owner": owner,
                "description": description,
                "acceptance": acceptance,
                "evidence": [],
                "status": "pending",
                "depends_on": [],
            })
    # Strict sequence: each task depends on the previous task, and the first
    # task of a phase depends on the last task of the previous phase.
    previous = None
    for task in tasks:
        if previous:
            task["depends_on"] = [previous]
        previous = task["id"]
    return tasks


def normalize_profile(value: str | None) -> str:
    if value in PROFILES:
        return value
    return "web-2d"


def bootstrap(project: Path, name: str, profile_id: str, overwrite: bool = False) -> dict:
    profile = PROFILES[normalize_profile(profile_id)]
    budget = profile["budget"]
    values = {
        "name": name,
        "profile_label": profile["label"],
        "engine": profile["engine"],
        "summary": profile["summary"],
        "fps": budget["target_fps"],
        "resolution": budget["resolution"],
        "draw_calls": budget["draw_calls"],
        "triangles": budget["triangles"],
        "texture_mb": budget["texture_mb"],
        "audio_mb": budget["audio_mb"],
        "rule": budget["rule"],
        "date": time.strftime("%Y-%m-%d"),
    }
    written = []
    for filename, template in PROFILE_FILES.items():
        target = project / filename
        if target.exists() and not overwrite:
            continue
        target.write_text(template.format(**values), encoding="utf-8")
        written.append(filename)

    tasks_path = project / "TASKS.json"
    if not tasks_path.exists() or overwrite:
        tasks = _phase_tasks(normalize_profile(profile_id))
        tasks_path.write_text(json.dumps({"project": name, "profile": normalize_profile(profile_id), "tasks": tasks}, indent=2) + "\n", encoding="utf-8")
        written.append("TASKS.json")

    meta_path = project / "forge.json"
    meta = {}
    if meta_path.exists():
        try:
            meta = json.loads(meta_path.read_text(encoding="utf-8"))
        except Exception:
            meta = {}
    meta.update({
        "name": name,
        "profile": normalize_profile(profile_id),
        "kind": profile["family"],
        "mode": profile["mode"],
        "engine": profile["engine"],
        "harness": "0.2",
    })
    meta_path.write_text(json.dumps(meta, indent=2) + "\n", encoding="utf-8")
    written.append("forge.json")
    return {"ok": True, "profile": normalize_profile(profile_id), "written": written}


def load_tasks(project: Path) -> list[dict]:
    p = project / "TASKS.json"
    if not p.exists():
        return []
    try:
        return json.loads(p.read_text(encoding="utf-8")).get("tasks", [])
    except Exception:
        return []


def save_tasks(project: Path, tasks: list[dict]) -> None:
    p = project / "TASKS.json"
    data = {"project": project.name, "profile": (json.loads((project / "forge.json").read_text(encoding="utf-8")).get("profile") if (project / "forge.json").exists() else "web-2d"), "tasks": tasks}
    p.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def ensure_task_chain(project: Path) -> list[dict]:
    """Load the board. Only legacy files WITHOUT any depends_on key get a sequential chain.

    A board that already carries a depends_on graph is the operator's graph: never rewrite it.
    (The old version chained every task to the previous one on every server start, which made
    'next' the only dispatchable task and blocked the permanent free-build slot forever.)
    """
    tasks = load_tasks(project)
    if not tasks:
        return tasks
    if any("depends_on" in task for task in tasks):
        return tasks
    previous = None
    for task in tasks:
        task["depends_on"] = [previous] if previous else []
        previous = task["id"]
    save_tasks(project, tasks)
    return tasks


def next_task(tasks: list[dict]) -> dict | None:
    done = {t["id"] for t in tasks if t.get("status") == "done"}
    for task in tasks:
        if task.get("status") != "pending":
            continue
        if task.get("freeform"):
            continue          # the permanent free-build slot is never auto-picked
        if all(dep in done for dep in task.get("depends_on", [])):
            return task
    return None


def game_dir(project: Path) -> str:
    """The folder the preview serves. Web projects: site/. Others: src/ or web/."""
    try:
        for name in ("site", "src", "web"):
            if (project / name).is_dir():
                return name + "/"
    except Exception:
        pass
    return ""


def build_contract(project: Path, task: dict | None = None, preview: str = "") -> str:
    """Appended to every build brief. Overrides any role 'outputs' line that says otherwise."""
    task = task or {}
    try:
        gdir = game_dir(project)
    except Exception:
        gdir = ""
    files = task.get("files") or []
    prove = str(task.get("prove") or "").strip()
    lines = [
        "",
        "BUILD CONTRACT — this overrides any 'Outputs expected' or 'update the artifact' line above:",
        "- The deliverable is a working change in the game, not a document. Markdown is not done.",
    ]
    if gdir:
        lines.append(f"- The game the preview serves is {gdir} — edit files there, not in docs.")
    if files:
        lines.append("- Files this task must change: " + ", ".join(str(f) for f in files))
    lines.append("- A doc may be updated only as a side effect of a code change already made.")
    if prove:
        lines.append(f"- Proof: run `{prove}` and return its exact output. No output = not done.")
    else:
        lines.append("- Proof: load the preview and show the change (screenshot path or console readout).")
    if preview:
        lines.append(f"- Preview: {preview}")
    lines += [
        "- Do not edit TASKS.json, do not mark the task done, do not write a summary file.",
        "- Return exactly: RESULT (1-3 lines), FILES CHANGED (path + bytes), PROOF (command + output), BLOCKERS.",
        "- If you cannot change the game files, say BLOCKED and why. Do not substitute a document.",
    ]
    return "\n".join(lines)


def _freeform_prompt(project: Path, task: dict, user_prompt: str, profile: dict) -> str:
    gdir = game_dir(project) or "./"
    instruction = (user_prompt or "").strip() or str(task.get("description") or "").strip()
    lines = [
        f"FREE BUILD for {project.name} — {profile['label']}.",
        "There is no board task. The operator's instruction below IS the task:",
        "",
        instruction or "(no instruction supplied — stop and ask for one)",
        "",
        f"Game files the preview serves: {gdir}",
        "Implement the instruction in those files. Do not create planning, audit or summary documents.",
        "Keep the change inside the instruction: no unrelated refactors, no new libraries.",
        "Then prove it: load the preview, exercise the change, and report the exact command/readout.",
        "Return exactly: RESULT (1-3 lines), FILES CHANGED (path + bytes), PROOF (command + output), BLOCKERS.",
    ]
    return "\n".join(lines)


def task_prompt(project: Path, task: dict, specialist_id: str, profile_id: str, user_prompt: str = "") -> str:
    profile = PROFILES[normalize_profile(profile_id)]
    if task.get("freeform"):
        return _freeform_prompt(project, task, user_prompt, profile)
    specialist = SPECIALISTS.get(specialist_id, SPECIALISTS["game-designer"])
    gdir = game_dir(project) or "./"
    files = task.get("files") or []
    lines = [
        f"You are the {specialist['name']} for {project.name}. This is a BUILD task, not a design pass.",
        f"Engine: {profile['label']} ({profile['engine']}). Game files: {gdir}",
        f"BUILD {task['id']}: {task['title']}",
        f"What to build: {task['description']}",
    ]
    if files:
        lines.append("Files you must change: " + ", ".join(str(f) for f in files))
    if task.get("prove"):
        lines.append(f"Proof command: {task['prove']}")
    lines += [
        f"Acceptance: {'; '.join(task.get('acceptance', []))}",
        "",
        "Rules:",
        "1. Make the change in the game files now. Reading more than the two files you need is wasted time.",
        "2. One task, one change. Do not touch unrelated systems.",
        "3. Run the proof and keep the output.",
        "4. Return RESULT / FILES CHANGED / PROOF / BLOCKERS. Do not mark the task done.",
    ]
    if user_prompt.strip():
        lines += ["", "Operator instruction (applies to this build):", user_prompt.strip()]
    return "\n".join(lines) + "\n" + build_contract(project, task)


def harness_payload() -> dict:
    return {
        "version": "0.2",
        "profiles": PROFILES,
        "phases": PHASES,
        "specialists": SPECIALISTS,
        "research": {
            "bmad_game_dev_studio": "https://github.com/bmad-code-org/bmad-module-game-dev-studio",
            "bmad_method": "https://github.com/bmad-code-org/BMAD-METHOD",
            "spec_kit": "https://github.com/github/spec-kit",
            "taskmaster": "https://github.com/eyaltoledano/claude-task-master",
            "unity_webgl_budget": "https://www.gauravgo.com/blog/shipping-a-unity-game-to-the-browser-what-actually-costs-you-frames/",
            "cc0_assets": "https://github.com/madjin/awesome-cc0",
        },
        "licences": {
            "bmad": "MIT — process principles adapted, not bundled.",
            "spec_kit": "MIT — artifact/gate principles adapted, not bundled.",
            "taskmaster": "MIT with Commons Clause — not copied or bundled; Forge uses its own task graph.",
        },
    }
