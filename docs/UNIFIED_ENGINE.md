# ONE LYGO ENGINE — Manager + Forge topology

**Date:** 2026-10-23  
**Decision:** one model engine, two separate UIs.

## Ports

```text
Console UI / host      http://127.0.0.1:9641
Manager UI             http://127.0.0.1:8790
Forge UI               http://127.0.0.1:8796
LYGO engine (Gemma)    http://127.0.0.1:11441
Shared engine bridge   http://127.0.0.1:8081/v1
NVIDIA free bridge     http://127.0.0.1:8082
```

## What runs

```text
LYGO Agent Manager.lnk
  └─ LYGO Agent Manager.bat
       ├─ Manager portal (8790)
       ├─ LYGO console (9641)
       ├─ LYGO engine bootstrap
       │    ├─ console engine Gemma 4 12B (11441)
       │    └─ shared bridge (8081 -> 11441)
       └─ browser: console 1.8 with Manager inline

LYGO Forge shortcut (only when wanted)
  └─ LYGO Forge.bat
       ├─ reuses the same engine (no second model)
       └─ Forge UI (8796) in its own window/browser tab
```

Both UIs can stay open at once. They share the same engine; Forge does not start a
second Qwen/llama-server.

## Engine identity

```text
Engine:  console host
Model:   gemma-4-12B-it-qat-UD-Q4_K_XL
Port:    11441
API:     loopback + console API key
Bridge:  8081 (injects key, rewrites legacy model aliases, disables thinking)
```

The bridge lets Manager and Forge keep their client code while talking to the console
engine. Legacy model names are rewritten to the engine's actual model at the bridge.

## Resource rules

1. **One model server.** Do not start a second llama-server/Qwen engine.
2. **One heavy GPU job at a time.** ComfyUI image/video, Blender renders and Audio Studio
   should not all load models simultaneously on the 8 GB card.
3. The engine is resident; ComfyUI/Blender jobs need free VRAM. Stop or unload the heavy
   job when finished.
4. Forge itself is an HTTP UI + dispatcher; it does not own a model server.
5. Manager does not embed Forge; it opens the Forge UI in its own window.

## Startup

```text
Manager.desktop.lnk
  -> bat -> portal + console + engine boot

Forge.desktop shortcut
  -> bat -> engine boot (reuse) -> Forge exe + browser
```

`<LYGO_DIR>\engine\LYGO_ENGINE_BOOT.ps1`:
- starts the console if 9641 is down
- waits for the console engine on 11441
- starts the bridge on 8081 if needed
- validates `/v1/models`
- is idempotent; repeated launches reuse the same processes

## Verified

```text
Manager services: 6/6
Manager chat:     MANAGER_ENGINE_OK via “LYGO Engine · console”
Manager bridge:   upstream http://127.0.0.1:11441
Forge self-test:  24/24
Forge local:      ready
Model servers:    one (11441)
Qwen 8080:        stopped
```

## Do not

- Do not re-enable the old Qwen 8080 launcher.
- Do not point Forge at a second local model.
- Do not run ComfyUI/Wan and a full Blender render at the same time on this card.
- Do not expose 11441/8081 beyond loopback.
- Do not print or store the console engine key in a client config; the bridge injects it.
