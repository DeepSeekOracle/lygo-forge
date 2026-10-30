param([string]$Name = "LYGOForge")
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root
Get-Process LYGOForge -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Write-Host "Building LYGO Forge executable..." -ForegroundColor Cyan
if (-not (Get-Command pyinstaller -ErrorAction SilentlyContinue)) {
  Write-Host "PyInstaller is not installed. Installing user-local..." -ForegroundColor Yellow
  C:\Python313\python.exe -m pip install --user pyinstaller
}
C:\Python313\python.exe -m PyInstaller --noconfirm --clean --onefile --name $Name --add-data "$root\web;web" --add-data "$root\template;template" --add-data "$root\licenses;licenses" --add-data "$root\docs;docs" --add-data "$root\harness;harness" --add-data "$root\skills;skills" --add-data "$root\workflow;workflow" "$root\server.py"
Write-Host "Built dist\$Name.exe" -ForegroundColor Green
