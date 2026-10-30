param(
  [Parameter(Mandatory=$true)][string]$ProjectPath,
  [string]$OutputDir = "",
  [string]$TestPlatform = "PlayMode",
  [string]$UnityExe = ""
)

$ErrorActionPreference = "Stop"
$ProjectPath = (Resolve-Path $ProjectPath).Path
if (-not $OutputDir) { $OutputDir = Join-Path $ProjectPath "TestResults\forge-playtest" }
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

if (-not $UnityExe) {
  $candidates = @(
    "C:\Program Files\Unity\Hub\Editor",
    "D:\Unity\Hub\Editor",
    "I:\Unity\Hub\Editor"
  )
  foreach ($base in $candidates) {
    if (Test-Path $base) {
      $UnityExe = Get-ChildItem $base -Recurse -Filter Unity.exe -ErrorAction SilentlyContinue |
        Sort-Object FullName -Descending | Select-Object -First 1 -Expand FullName
      if ($UnityExe) { break }
    }
  }
}
if (-not $UnityExe -or -not (Test-Path $UnityExe)) {
  Write-Output (ConvertTo-Json @{ ok = $false; error = "unity_exe_not_found" } -Compress)
  exit 2
}

$results = Join-Path $OutputDir "results.xml"
$log = Join-Path $OutputDir "unity-test.log"
$args = @(
  "-batchmode", "-nographics", "-quit",
  "-projectPath", $ProjectPath,
  "-runTests", "-testPlatform", $TestPlatform,
  "-testResults", $results,
  "-logFile", $log
)
& $UnityExe @args
$code = $LASTEXITCODE

$passed = 0; $failed = 0; $total = 0
if (Test-Path $results) {
  [xml]$xml = Get-Content $results -Raw
  $run = $xml.'test-run'
  if ($run) {
    $total = [int]$run.total
    $passed = [int]$run.passed
    $failed = [int]$run.failed
  }
}
$report = @{
  ok = ($code -eq 0 -and $failed -eq 0 -and $total -gt 0)
  unity = $UnityExe
  project = $ProjectPath
  platform = $TestPlatform
  exit = $code
  total = $total
  passed = $passed
  failed = $failed
  results = $(if (Test-Path $results) { $results } else { $null })
  log = $(if (Test-Path $log) { $log } else { $null })
  note = "PlayMode tests prove logic/scene load. Add Unity Recorder captures for visual proof."
}
$report | ConvertTo-Json -Depth 4 | Set-Content (Join-Path $OutputDir "playtest-report.json") -Encoding utf8
Write-Output ($report | ConvertTo-Json -Depth 4)
if ($report.ok) { exit 0 } else { exit 1 }
