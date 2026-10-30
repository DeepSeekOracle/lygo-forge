param([switch]$Uninstall)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$dest = Join-Path $env:LOCALAPPDATA "LYGO Forge"
$exe = Join-Path $root "dist\LYGOForge.exe"
if ($Uninstall) {
  Get-Process LYGOForge -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
  Remove-Item (Join-Path ([Environment]::GetFolderPath("Desktop")) "LYGO Forge.lnk") -Force -ErrorAction SilentlyContinue
  Remove-Item (Join-Path ([Environment]::GetFolderPath("StartMenu")) "Programs\LYGO Forge.lnk") -Force -ErrorAction SilentlyContinue
  Write-Host "Shortcuts removed. Local app data left intact at $env:LOCALAPPDATA\LYGO Forge"
  exit 0
}
if (-not (Test-Path $exe)) { throw "Build the exe first: powershell -File build-exe.ps1" }
New-Item -ItemType Directory -Force $dest | Out-Null
Copy-Item $exe (Join-Path $dest "LYGOForge.exe") -Force
$upgrade = Join-Path $root "UPGRADE_LLM.txt"
if (Test-Path $upgrade) { Copy-Item $upgrade (Join-Path $dest "UPGRADE_LLM.txt") -Force }
$ws = New-Object -ComObject WScript.Shell
foreach ($dir in @([Environment]::GetFolderPath("Desktop"), (Join-Path ([Environment]::GetFolderPath("StartMenu")) "Programs"))) {
  $lnk = $ws.CreateShortcut((Join-Path $dir "LYGO Forge.lnk"))
  $lnk.TargetPath = (Join-Path $dest "LYGOForge.exe")
  $lnk.WorkingDirectory = $dest
  $lnk.IconLocation = (Join-Path $dest "LYGOForge.exe")
  $lnk.Save()
}
Write-Host "Installed LYGO Forge to $dest" -ForegroundColor Green
Write-Host "Desktop + Start Menu shortcuts created."
Write-Host "Shipped brain: QwenPaw (basic). Upgrade notes: UPGRADE_LLM.txt and docs/LLM.md"
