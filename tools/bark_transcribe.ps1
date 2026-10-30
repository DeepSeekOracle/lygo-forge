param(
  [Parameter(Mandatory = $true)][string]$Audio,
  [ValidateSet("cpu", "cuda")][string]$Device = "cpu",
  [string]$Model = "<FORGE_DIR>\tools\bark-model",
  [string]$Python = "<FORGE_DIR>\.venv-bark\Scripts\python.exe"
)
$ErrorActionPreference = "Stop"
if (-not (Test-Path $Audio)) { throw "Audio not found: $Audio" }
if (-not (Test-Path $Python)) { throw "Bark venv missing: $Python" }
if (-not (Test-Path (Join-Path $Model "model.bark"))) { throw "Bark model missing: $Model" }
& $Python (Join-Path $Model "runtime\transcribe_bark.py") --model $Model --audio $Audio --device $Device
exit $LASTEXITCODE
