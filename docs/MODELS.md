# Manager + Forge — the shared local brain

Decision date: 2026-10-26. Measured on this rig (RTX 4060 Ti **8 GB**, i5-13600KF, 31.8 GB RAM).

## The answer: Qwen3-4B-Instruct-2507-Q4_K_M is the anchor

| Evidence | Value |
|---|---|
| Decode speed (120 tokens, 64K ctx) | **59.6 tok/s** (2.01 s wall) |
| Tool calling (`--jinja`, one tool offered) | **works** — returned `tool_calls: get_time` |
| VRAM at 64K ctx | 7,116 / 8,188 MiB with q4_0 KV — used, because Hermes needs 64K |
| Final ctx | 65,536 - HERMES_CONTEXT_FLOOR requires it |
| Weights | 2.3 GB Q4_K_M |
| Native context | 256K (we run 65,536) |

Same verdict the 5.3 agent reached: Qwen3-4B is the best reasoning-per-byte that fits an 8 GB card
with room for the console, the Forge and the odd ComfyUI job.

## What was actually running (the mess)

Two llama-servers, and the labels lied:

| Port | Process | Reality |
|---|---|---|
| **11441** | llama-server, `-c 32768` | **QwenPaw-Flash-9B**, not the `gemma-4-12B` its config claimed |
| 8081 | pythonw bridge | proxies the console engine to the Forge |
| 8082 | pythonw NVIDIA bridge | API route |
| 9641 | python console | LYGO console |

With my test server stopped, total VRAM in use was **1,823 MiB** — so the 9B engine is largely
**CPU-offloaded**. That is the real reason it feels slow and limited, not just context length.

The architecture is right: **one engine on 11441, bridge 8081, Forge brain points at the bridge.**
So both apps already share a brain — it was just the wrong brain, mislabelled.

## Changes made

1. `<PROJECTS>\lattice-city\docs\MODELS.md` — this file.
2. `<LYGO_DIR>\engine\LYGO_ENGINE_BOOT.ps1`: `$engineModel` `gemma-4-12B…` → **`qwen3-4b-instruct`**
   (backup at `%TEMP%\LYGO_ENGINE_BOOT.ps1.bak-20261026`).
3. Stopped the duplicate test server that was serving Qwen3-4B on 8080 (two brains is worse than one).

## Still to do (needs a console restart, so it waits for you)

1. Restart the console/engine so 11441 loads the anchor:
   `powershell -File <LYGO_DIR>\engine\LYGO_ENGINE_BOOT.ps1`
2. Verify: `curl -H "Authorization: Bearer local" http://127.0.0.1:11441/v1/models` → `qwen3-4b-instruct`
   and Forge `GET /api/status` → `brain.model` matches. Both must read the same string.
3. If the engine launcher resolves `$engineModel` as a **path** rather than an alias, point it at
   `<MEDIA>\models\local\Qwen3-4B-Instruct-2507-Q4_K_M.gguf` instead.

## Launch args for the anchor

```
-m <MEDIA>\models\local\Qwen3-4B-Instruct-2507-Q4_K_M.gguf
-c 65536 -ngl 79 -ctk q4_0 -ctv q4_0 -fa on --parallel 1
--alias qwen3-4b-instruct --jinja --api-key local --host 127.0.0.1 --port 11441
```

`--jinja` is not optional: without it tool calling degrades and the Forge agents lose function calls.
32K is the sweet spot — 64K measured 7.1 GB and leaves no room for anything else.

## Fallback ladder (pick per task, not per mood)

| Task | Model | Why |
|---|---|---|
| **Default anchor** (both apps) | `qwen3-4b-instruct` | 59.6 tok/s, tools, fits |
| Deeper reasoning, slower | `mimo-v2.6-9b` | 9B depth; expect offload at 32K |
| Code / patches | `qwen2.5-coder-7b` | purpose-trained for code |
| Long prose, writing | `gemma-4-12B` | best voice, heavy — use when not gaming |
| Overnight batch | `qwen3.6-35b-a3b` (MoE, ngl 12) | quality over speed, CPU experts |
| API primary | NVIDIA `nemotron-3-ultra-550b-a55b` via 8082 | flagship MoE, tools yes, 0.75 s/40 tok |

## Rule

One anchor, always on 11441. Everything else is an explicit, temporary swap — and the Forge brain and
console engine must report the **same model string**. If they disagree, the versions have drifted.

## CPU bypass / offload

`<LYGO_DIR>\engine\LYGO_OFFLOAD.ps1`

On an 8 GB card at 64K the anchor holds ~7.1 GB. When Unity, ComfyUI or a browser needs the card,
serving matters more than speed. This hands the engine over at a lower layer count:

| Mode | ngl | What it does | Measured |
|---|---|---|---|
| `-Mode cpu` | 1 | CPU bypass - 78 of 79 layers in RAM | 3,006 MiB VRAM (frees 4.6 GB), 19.3 tok/s |
| `-Mode gpu` | 79 | full GPU | 7,644 MiB VRAM, 64.9 tok/s |
| `-Mode <n>` | n | explicit layer count | - |
| `-Mode restore` | - | hand the engine back to the console | console `engine=ready`, gate ALIGNED |

Context and KV never change: 65,536 / q4_0, because HERMES_CONTEXT_FLOOR = 65536.

**Why it bypasses the console:** the console's `console.json` ngl pin is NOT honored for this model -
tested twice, ngl 1 written, engine still launched `-ngl 79`. So the script stops the
console-managed engine and owns the process with its own key (`lygo-offload`). Side effect: while a
bypass engine runs, the console's own STATE reads `missing` - by design, it does not own that
process. The bridge on 8081 discovers the key from the live process, so the Forge can still reach it
(not exercised end to end in the same test).

Result of every run is written to `%LOCALAPPDATA%\LYGO\AgentManager\offload.json` and
`offload.log`.

## API usage ledger (test key - watch for runaway, not for cost)

The API key is a free test key, so the risk is a **loop**, not a bill. Every portal API completion
appends one line to `%LOCALAPPDATA%\LYGO\AgentManager\api-usage.jsonl` with the provider-reported
token counts, model and elapsed time.

```
python <LYGO_DIR>\tools\api_usage.py            # today / 7 days / all time + burn check
python <LYGO_DIR>\tools\api_usage.py --tail 20  # last N calls, one per line
```

It warns at **40 calls/hour** or **200,000 tokens/hour** - a person does not do that, a retry loop
does.

Note: only the **portal** route is instrumented. The console (9641) calls the API through its own
Hermes path and does not write this ledger, so the numbers here are a floor, not a complete bill.

## Master routing (2026-10-28)

`/api/build` — the build desk "Ask Hermes" box — used to know only two routes: the local Hermes engine
and the OpenCode CLI. Gemini and the console's own API brain were unreachable from the Master. Now:

| Model id (dropdown) | Provider | Route | Measured |
|---|---|---|---|
| `hermes` | LYGO engine | `_run_hermes` → console engine (Qwen3-4B-Instruct-2507, 64K) | existing |
| `gemini/gemini-3-flash-preview` | Gemini official API | `_gemini_chat` → `cmd /c gemini.cmd -p … -m … -y` | **3.4 s**, reply "MASTER OK" |
| `gemini/gemini-3.1-flash-lite` | Gemini official API | same | ready (quota-shared) |
| `gemini/gemini-3.1-pro-preview` | Gemini official API | same | quota-limited on this key |
| `nvidia/nvidia/nemotron-3-ultra-550b-a55b` | **NVIDIA official API** | `_http_chat` → bridge `:8082/v1` | **1.7 s**, reply "MASTER OK" |
| `nvidia/z-ai/glm-5.3-flash` | NVIDIA free bridge | OpenCode/bridge | existing |
| `local/lygo-engine` | shared console engine | `_http_chat` → bridge `:8081/v1` | **0.6 s**, reply "MASTER OK" |
| `opencode/*` (4 free) | OpenCode | CLI `run --auto --model` | existing |

Launcher notes that bit twice:
- the npm `gemini.cmd` shim **must** be launched through `cmd /c` — a direct `Popen` with piped stdio
  never returns (bare 5.8 s vs `cmd /c` 6.7 s).
- `nemotron-3-ultra` returns `content: null` with the answer in `reasoning_content` on small budgets;
  `_http_chat` falls back to `reasoning_content`.

## Console state in the Forge

`GET /api/status -> console` (10 s cache) mirrors the Manager Console so the two never disagree:

```json
{"up": true, "build": "v1.9.0", "engine": "ready", "selected": "Qwen3-4B-Instruct-2507",
 "models": 34, "limbs": 101, "ram_gb": 11.5, "hermes_api": "nvidia/nemotron-3-ultra-550b-a55b",
 "gpu_free_mib": 774, "signature": "Δ9Φ963-LYGO-LLM-CONSOLE-v1"}
```

Rendered as a one-line strip under the header:
`v1.9.0 · engine ready · Qwen3-4B-Instruct-2507 · 34 models · 11.5 GB free · nemotron-3-ultra-550b-a55b`
(chip 17 px tall, header stays 58 px).
