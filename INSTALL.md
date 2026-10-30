# Install, run and build — LYGO Forge 1.9.1

## Route A — prebuilt EXE

1. Get **Forge 1.9.1** from the LYGO Skill Hub. It is a **one-folder** build — keep the folder
   together; the `.exe` needs its siblings.
2. Verify the published hash before running it.
3. Unpack somewhere writable that is **not** inside `Program Files` (the Forge writes `jobs/`,
   `data/` and project output next to itself).
4. Run `LYGOForge.exe`, open <http://127.0.0.1:8796>.

The EXE ships **tools**, not assets. Your projects, art and models are yours to place.

## Route B — from source

### Prerequisites

| Need | Detail |
|---|---|
| Python | **3.13** |
| Model | local engine on **11441** (shared) or a configured free API path |
| Optional | PyInstaller **6.22.3** for the EXE |
| Optional | Node.js, only for tool folders that carry a `package.json` |

### Steps

```powershell
git clone <this repo> lygo-forge
cd lygo-forge

.\install.ps1                  # environment checks + first-run config
Select-String -Path *.py,*.json -Pattern '<FORGE_DIR>'   # any remaining placeholders?

python server.py               # or .\LYGO Forge.bat
```

Then open <http://127.0.0.1:8796>.

Placeholders: the public tree was scrubbed of the builder's layout, so any `<FORGE_DIR>`,
`<CONSOLE_DIR>` or `<USER>` string must be replaced with your own paths before the feature that
uses it will work. `install.ps1` fills the common ones; check what is left with the command above.

### Verify

```powershell
Invoke-RestMethod http://127.0.0.1:8796/api/status
C:\Python313\python.exe forge_selftest.py
C:\Python313\python.exe -m pytest -q
```

### Build the EXE (one-folder, deliberately)

```powershell
.\build-exe.ps1
# or directly:
C:\Python313\python.exe -m PyInstaller LYGOForge.spec --noconfirm
```

One-folder, **not** one-file: a 16 GB working tree does not belong inside a single executable, and
one-file builds unpack to `%TEMP%` on every run.

Before shipping the built folder:

- **Exclude assets.** `<ASSETS>`, `jobs/`, `projects/` and model caches must not be inside the
  dist folder. Ship tools and skills only.
- Run the sanitizer over the staged tree and let it fail you if a secret or an absolute builder
  path survives.
- Only then point Inno Setup (or your packer) at the staged folder.

### Ports

| Port | Service |
|---|---|
| 8796 | Forge |
| 11441 | shared local engine (not owned by the Forge) |
| 8081 | bridge to that engine |
| 9641 | LYGO LLM Console (separate system) |
| 8790 | LYGO Manager (separate system) |

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `local_ready: false`, board parks | no engine on 11441 and no API path configured | start the console's engine or configure a free API path |
| Port 8796 in use | another Forge instance | check `Get-NetTCPConnection -LocalPort 8796`; one instance only |
| Job stalls at dispatch | model call timed out (25 s free-API path) | the dispatcher retries; if it repeats, the model endpoint is the problem |
| Console window pops up per turn | a bare `subprocess` spawn | `win_quiet.py` patches `Popen` with `CREATE_NO_WINDOW`; do not reintroduce a bare `subprocess.run` |
| EXE starts then closes | unpacked without its sibling files | it is one-folder: keep the directory intact |
| pytest errors on symlink tests | Windows privilege (WinError 1314) | expected; those tests skip on a normal user account |
| Missing tool payload | `tools/<name>` excluded from the repo | install that tool from the Forge UI or copy the payload in yourself |

## Uninstall

Stop the Forge, delete the folder (or the unpacked EXE directory). No service, no scheduled task, no
registry entry. `jobs/` and `data/` hold your work — move them out first if you want to keep them.
