# Stream PC as a QA / build node

The stream PC is a **second machine**, not a second LYGO engine.

## Verified

```text
Host:      <STREAM_PC> / <STREAM_HOST_IP>
GPU:       NVIDIA GTX 1060 6 GB
VRAM free: ~4.4 GB
GPU util:  ~46% (stream/OBS workload)
RAM:       15.9 GB
Node:      C:\Program Files\nodejs\node.exe
```

This is **not** suitable for 6 GB TripoSR or a second 12B engine. It is useful for:

- browser/QA runs
- CPU-side packaging
- remote build checks
- independent screenshots of a LAN-served build

## Access

```powershell
ssh -o BatchMode=yes -o StrictHostKeyChecking=no -i <USER>\.ssh\<SSH_KEY> lygo@<STREAM_HOST_IP> "hostname"
```

Do not stop OBS or restart the stream while it is live. Read logs before touching services.

## Safe remote uses

1. **Browser QA** — serve a build on the local PC bound to the LAN, open it on the stream PC.
2. **Package QA** — copy a release ZIP and verify its SHA-256 on the stream PC.
3. **Unity/Node checks** — only if the needed runtime exists; do not install heavy models.

## Not safe

- running TripoSR/Wan/ComfyUI on 4.4 GB free VRAM
- starting a second `llama-server` on 8081/8082
- changing OBS scenes/encoders
- copying credentials into screenshots or task bodies

## LAN note

Local PC: `<LAN_IP>`. Stream PC: `<STREAM_HOST_IP>`. A QA server must bind to the LAN
explicitly and be stopped after the test; do not expose it beyond the LAN.

## Verified release hash (2026-10-23)

```text
Local release: <PROJECTS>\forge-cycle-smoke\dispatcher\release-unity\battle-tv-smoke-0.1.0-windows.zip
Bytes: 296,934,396
SHA-256: FDF4D288C824251B58FA3E20791D3575A910D27C421974FAD2A9677E39B95D9D
Stream copy: C:\LYRA_STREAM\forge-cycle\battle-tv-smoke-0.1.0-windows.zip
Stream hash: FDF4D288C824251B58FA3E20791D3575A910D27C421974FAD2A9677E39B95D9D
Result: MATCH
```
