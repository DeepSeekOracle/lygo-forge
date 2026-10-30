# FORGE MODEL FIT

Use `llmfit` before downloading or assigning a local model. It inspects the actual machine and
ranks open models by memory fit, estimated speed, quality and context.

## Installed

```text
llmfit 1.1.10
Path: <USER>\AppData\Local\Microsoft\WinGet\Packages\AlexsJones.llmfit_Microsoft.Winget.Source_8wekyb3d8bbwe\llmfit-v1.1.10-x86_64-pc-windows-msvc\llmfit.exe
Alias: llmfit
Licence: MIT
```

## Host detection

```text
CPU:      13th Gen Intel Core i5-13600KF, 20 cores
RAM:      31.82 GB total / 6.44 GB available
Bandwidth: ~95 GB/s measured
GPU:      NVIDIA GeForce RTX 4060 Ti, 8.00 GB VRAM, CUDA
Backend:  CUDA
Compatible models found: 9,361
```

## Commands

```powershell
llmfit                       # interactive TUI
llmfit fit                   # ranked table
llmfit fit --show-incompatible
llmfit recommend --json      # agent/script consumption
llmfit info "<model>"        # fit basis + verify commands
llmfit doctor                # hardware report
llmfit bench                 # real tok/s against a running provider
```

The winget install updates PATH only for a new shell; use the full path above in an existing
session.

## Forge rules

- Run `llmfit` before selecting a model for a worker or local job.
- Prefer a model that fits **VRAM with headroom**; the host can have under 7 GB free while other
  engines/desktop apps run.
- Treat estimated tok/s as an estimate, not a benchmark.
- If a job depends on real performance, run `llmfit bench` against the actual provider.
- Record model name, quantization, fit/score, estimated memory and context in the job note.
- Never download a 20 GB model on a guess; use `llmfit info` first.
- No paid model route is required to use llmfit.

## Forge handoff

1. Pipeline Engineer runs `llmfit recommend --json` for the job class.
2. Technical Artist/worker selects a compatible model.
3. If a live benchmark is needed, run `llmfit bench`.
4. Record the selection and evidence; do not claim measured speed without a bench.
5. Keep model assets outside the game build; package only engine-ready outputs.
