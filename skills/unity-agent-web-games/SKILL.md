---
name: unity-agent-web-games
description: "Use when wiring agents to Unity for a browser-playable game."
---

# Building a browser-playable game in Unity, driven by agents

Trigger: the owner wants a game with real 3D graphics that people can play **from his web page**, built
from a free template and then enhanced, with agents (Hermes / Grok) doing the wiring. The deliverable is
an MCP-driven Unity project that produces a WebGL build he can drop on a landing page.

## 1. Engine choice: decide it on the TARGET, not on the screenshots

Ask where the game must be playable, because that one question eliminates engines:

| Target | Engine |
|---|---|
| **In-page, plays in a browser** | **Unity 6 (native WebGL build)** or Godot |
| A download the page offers | Unity or Unreal, either |
| A quick 2D page game | Stay on canvas/JS — an engine is the wrong tool |

- **Unreal cannot target the web.** Epic removed HTML5 export after UE 4.24; the official answer is Pixel
  Streaming (renders on a GPU server and streams video - not a standalone web build, and the UE community
  says plainly it is not fit for games). Community HTML5 forks are UE4-era. So a UE game is always a
  download, never in-page. Say this out loud before anyone spends 110 GB on the engine.
- **Unity's WebGL export is a first-class build target**, which is the whole reason it wins this case.
- **The engine does not make the game good.** It makes it look good. Canvas/JS still beats Unity for a
  two-day 2D page game (instant load, no pipeline); Unity wins for 3D, lighting, physics and template
  content. State the trade rather than implying the engine is an upgrade by itself.
- Budget: a Unity editor plus the WebGL module is roughly **10-20 GB**; Unreal 5 is roughly **110 GB**.

## 2. Where it lives (measure the drives, do not guess)

A drive letter says nothing about the medium - read it:

```powershell
Get-PhysicalDisk | Select-Object DeviceId,FriendlyName,MediaType,BusType,Size
Get-Partition | Where-Object DriveLetter | Select-Object DriveLetter,DiskNumber,Size
```

On this rig that revealed `I:` and `J:` are **USB external HDDs** (despite large free space) while `D:` is
a SATA SSD and `C:` is NVMe. An engine that compiles shaders belongs on a real SSD; "lots of free space"
is the wrong selection criterion. Keep the engine, the project, and the derived data cache on the fast
SSD, and check the space **before** downloading.

## 3. Wire the agents in over MCP - and skip the paid one

Unity's integration surface is **MCP**, so any MCP-capable client (Hermes, and any other agent) can drive
the editor through one protocol. Options, best first for an unpaid setup:

| Server | Licence / cost | Surface |
|---|---|---|
| `JESVN/unity-mcp-server` (AnkleBreaker) | free, open source | **288 tools / 30+ categories**, Unity Hub control, scenes, GameObjects, builds, profiling, Shader Graph, terrain, NavMesh, animation, multi-instance |
| `CoplayDev/unity-mcp` (MCP for Unity) | **MIT** | 34 tools, assets/scenes/scripts/tests; the same makers ship **Godot AI** |
| Unity's own Unity MCP | **needs Unity Cloud + a Unity AI subscription** | built-in, credit-based, cannot use external models |

**Recommend the free servers.** Unity's official MCP gates on a subscription and cannot be pointed at
Claude/GPT/etc - the third-party ones cost nothing and expose far more. Do not put the paid gate in
front of an experiment.

### 3b. The faster path: the official CLI bridge already exists, no MCP server required

Check this **before** installing anything. Unity ships a Pipeline bridge plus a `unity` CLI
(`%LOCALAPPDATA%\Unity\bin\unity.exe`, installed with recent Hub versions). On this rig it was already
live: `unity status` returned the open project, editor version, PID, port and state `ready`, and
`unity list` returned **142 built-in editor tools** - scene/GameObject/component/asset/animator authoring,
`build` + `build_status` (full BuildReport), `capture_game_view` / `capture_scene_view` (PNGs),
`console` (log tail), `recompile`, tests, audits, lighting/NavMesh bakes. That is the agent limb already
wired, free, with no subscription and no third-party server.

Drive it as: `unity status` -> `unity list` -> `unity command <tool> --project-path <path> --result-only
--json` (add `--detach` for long jobs and poll their `*_status` tool). `unity skill show` / `unity skill
install <client>` is Unity's own agent guide. Only fall back to the third-party MCP servers when a tool
the CLI does not expose is actually needed.

### 3c. Create the project from a template non-interactively

```
unity templates list --editor 6000.5.9f1        # what this editor can pull
unity projects new "<Name>" --path "D:/parent" --editor-version 6000.5.9f1 --template com.unity.template.fps
```

Templates are marked `ready` / `upgradable` / `downloadable`; creating one downloads and imports it.
Do **not** read the Hub GUI for this - `templates list` is authoritative for the editor version in use, and
the offering differs per version (on 6000.5 the only Learning **game** template is the FPS Microgame;
Karting / 2D Platformer / LEGO microgames are not offered for it).

Client setup is an MCP server entry pointing at the server's entry script; Unity's own relay (when used)
lives at `%USERPROFILE%\.unity\relay\relay_win.exe` and takes `--mcp`. A **direct external client
connection is approved by the operator in the editor** (Project Settings > AI) the first time - expect a
dialog, not a silent connect.

## 4. What is ours to build, and what stays the user's

The owner's design (and it is the right one): ship the **wiring**, not the bundle. We provide

- a **skill** - how our agents drive the engine: template choice, MCP call order, the build-and-verify
  loop, where projects live;
- a **limb** - the console's handle to the editor/MCP endpoint, reporting whether the engine is present
  and how to get it;

and the **user supplies the engine and the assets** on their own machine (they get Unity from Unity, and
templates/assets from Unity's own library). Nothing large is redistributed, so nothing needs a licence
review, and the console stays shippable without a 10 GB payload.

## 5. The build loop

1. Install Unity Hub, then **Unity 6 (6000.x)** plus the **WebGL Build Support** module for that version.
   The Hub installer is small; the editor is the download.
2. Create a project **from a template** (the owner's stated plan: take a template, then enhance it - do
   not start from an empty scene).
3. Install the MCP server, point the client at it, let the operator approve the editor connection.
4. Drive changes through MCP; verify each one by **reading the editor console back** through the same
   connection before moving on - the agent edits, then confirms, then edits again.
5. Build WebGL (`File > Build Settings > WebGL > Build`), then **serve the output and actually load it** in
   a browser before showing anyone.
6. Ship it as a static folder (the build is HTML/JS/WASM + data) onto the landing page.

### 5b. The WebGL build, non-interactively (verified 2026-10-10)

`unity build --target WebGL` **fails by design**: *"Target WebGL has no built-in command-line build. Pass
--execute-method, or use a Unity 6+ build profile with --profile. Only desktop targets build without
them."* The working sequence is:

```
unity build "<project>" --create-profile WebGL          # writes Assets/Settings/Build Profiles/WebGL.asset
unity build "<project>" --profile WebGL -o "<outdir>" --no-tail --log-file "<log>"
```

- **Never wrap the build in a shell `timeout`** and do not put it on the tool's foreground path: a WebGL
  build of a microgame-sized project takes **~8-12 minutes**, and a cap or call ceiling kills it mid-way
  (a killed run leaves `unity-build.provenance.json` with `exitCode: 143` and a half-written Build/ folder).
  Launch it as a tracked background process and poll the log file plus the output folder — arriving
  artifacts are the proof, not the CLI's exit code.
- Expect the benign line `[license] [Licensing::Module] LicensingClient has failed validation; ignoring`
  alongside `Exiting batchmode successfully now!` and return code 0. Success is reported, not hidden.
- **Serving a WebGL build needs the gzip header.** It will not run from `file://`, and `python -m
  http.server` alone breaks it: Unity's loader wants `.gz` payloads with `Content-Encoding: gzip`, while
  SimpleHTTPRequestHandler sends `application/gzip` with no encoding. Patch the handler (or build with
  decompression fallback) before blaming the build. A microgame build is ~24 MB gzipped for a first
  visitor — state that size out loud before it goes on a landing page.
- Verify by actually **loading it in a browser and clicking into gameplay**, not by looking at the file
  list: the intro menu rendering proves the loader, the first frame of gameplay proves the scene, scripts
  and wasm all came up.

## Free bases: what actually exists, verified 2026-10-10

Full menu with sources and licences: `GAME_BASE_MENU_2026-10-10.md` in the handoff folder
(`<EDRIVE>\lygo-protocol-stack\UNITY_HANDOFF_2026-10-10\`). The load-bearing facts:

- **Free complete playable templates exist for: FPS, 2D platformer/side-scroller, kart racer, board/chess,
  card, tower defence, puzzle/RPG** (Unity's own templates and Creator Kits; MIT repos for chess, tower
  defence, card games).
- **They do NOT exist for sports, boxing/fighting or farming/simulator** - those are paid templates
  ($6-50: Basketball Dunk Shot, FPS Basketball $49.99, Head Ball $49.99, Farming Engine $49, Punch
  Perfect boxing). Free *art* for those themes exists (Kenney packs); a free *framework* does not. Genre
  choice is therefore constrained by budget - say so instead of searching longer.
- **Kenney's Starter Kits are Godot, not Unity** (Match-3, Racing, 3D Platformer, FPS, City Builder). His
  CC0 *assets* are excellent for a Unity project; his *kits* cannot be imported. Do not chase them.
- **Art/audio that can ship: Kenney (60k+ assets, CC0), Quaternius (low-poly packs + 250+ animation clips,
  CC0), Poly Haven (textures/HDRIs, CC0), KayKit (CC0 characters), Freesound/Sonniss (sound).** Mixamo is
  free for commercial use but **forbids redistributing the raw files** and is barely maintained - keep your
  own copies, never commit them to a public repo.
- **Never source from the "free download" aggregators** (`unityassetpack.com`, `unityassetcollection.com`,
  `opengameasset.net`, "50 Unity Source Codes" bundles) - they redistribute paid Asset Store packages
  without a licence, and nothing built on them can be published. The owner publishes, so this is a hard no.
- **Read the repo's LICENSE before building on a GitHub game.** Popular, well-made Unity repos exist with
  no license file at all (e.g. the Mario-Kart-style racer) or with "for educational purposes" wording
  (e.g. the Angry-Birds clone) - that is **not** permission to ship. MIT/Apache only, verified at the file.

## Pitfalls

- **The editor needs the GPU and a big slice of RAM, and a resident local LLM engine holds both.** On a
  one-card box, park the engine (park -> run the editor -> wake, with the wake in a `finally`) before
  opening Unity, or both crawl. The parking pattern lives in `local-llm-engine-tuning`
  (`references/parking-a-resident-engine.md`); this rig measured **719 MiB free of 8188 MiB VRAM** and
  **11.9 GB free of 31.8 GB RAM** with the console up - Unreal or Unity will not fit beside that.
- **A WebGL build is not a web page you can edit live.** Iteration is: change in the editor, rebuild,
  reload. Budget for that; it is the main cost versus canvas/JS.
- **First-load size is real.** WebGL builds commonly run tens of MB; keep the template's assets trimmed
  and say the size out loud rather than discovering it on a phone.
- **Unity requires a Unity ID login** - never guess or handle those credentials; the operator signs in
  on their own machine.
- **Do not install Unreal "as well" to compare.** The comparison is decided by the target (section 1),
  and 110 GB on a build SSD is a real cost to the very drive the LLM work needs.
- **A verifiable milestone beats a long build.** Get the template running and building to WebGL *first* -
  that proves the whole chain (editor, MCP, build, browser) before any art or gameplay work is paid for.
