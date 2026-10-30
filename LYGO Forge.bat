@echo off
setlocal EnableExtensions EnableDelayedExpansion
title LYGO FORGE 1.0.0
color 0E

set "ROOT=%~dp0"
set "PY=C:\Python313\python.exe"
set "URL=http://127.0.0.1:8796/"
set "LOGDIR=%LOCALAPPDATA%\LYGO\Forge"
set "ENGINE_BOOT=<LYGO_DIR>\engine\LYGO_ENGINE_BOOT.ps1"
set "LOCAL_BRIDGE=<LYGO_DIR>\lygo-local-bridge\lygo_local_bridge.py"
set "ANCHOR=Qwen3-4B-Instruct-2507"
set "ANCHOR_CTX=32K"
set "PROJECTS=<PROJECTS>"
set "ASSETS=<ASSETS>"

if not exist "%LOGDIR%" mkdir "%LOGDIR%" >nul 2>&1
cd /d "%ROOT%"

cls
echo.
echo   ==========================================================================
echo.
echo      _____ ___  ____   ____ _____
echo     ^|  ___/ _ \^|  _ \ / ___^| ____^|
echo     ^| ^|_ ^| ^| ^| ^| ^|_) ^| ^|  _^|  _^|
echo     ^|  _^|^| ^|_^| ^|  _ ^<^| ^|_^| ^| ^|___
echo     ^|_^|   \___/^|_^| \_\____^|_____^|
echo.
echo   ==========================================================================
echo     L Y G O   F O R G E                             v1.0.0
echo     local game studio  -  no account, no credits, no telemetry
echo   ==========================================================================
echo.
echo     ANCHOR    %ANCHOR%   ctx %ANCHOR_CTX%   engine 11441   bridge 8081
echo     GAMES     18 live titles                    %PROJECTS%
echo     ASSETS    one indexed pool                  %ASSETS%
echo     SKILLS    99 in the vault                   forge\skills
echo     UI        %URL%
echo.
echo   --------------------------------------------------------------------------
echo.

if not exist "%PY%" (
  echo   [FAIL] Python 3.13 not found at %PY%
  goto :failed
)

echo   [BRAIN]   attaching to the shared engine on 11441
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "if (-not (Get-NetTCPConnection -LocalPort 8081 -State Listen -ErrorAction SilentlyContinue)) { Start-Process -FilePath 'C:\Python313\pythonw.exe' -ArgumentList '%LOCAL_BRIDGE%' -WindowStyle Hidden }" >nul 2>&1
if exist "%ENGINE_BOOT%" (
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%ENGINE_BOOT%" >nul 2>&1
  if errorlevel 1 echo   [WARN]    engine not ready; Forge runs, local worker shows offline.
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "try { $m=(Invoke-WebRequest 'http://127.0.0.1:11441/v1/models' -Headers @{Authorization='Bearer local'} -UseBasicParsing -TimeoutSec 3).Content | ConvertFrom-Json; Write-Host ('  [MODEL]   ' + ($m.data.id -join ',')) } catch { Write-Host '  [MODEL]   11441 not answering - start LYGO Agent Manager first' }"

powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "if (Get-NetTCPConnection -State Listen -LocalPort 8796 -ErrorAction SilentlyContinue) { exit 0 } else { exit 1 }" >nul 2>&1
if not errorlevel 1 (
  echo   [LIVE]    Forge already running - reusing it, no duplicate server
  set "LYGOB=<INSTALL_DIR>\app\LygoBrowser.exe"
if exist "%LYGOB%" ( start "" "%LYGOB%" "%URL%" ) else ( start "" "%URL%" )
  goto :done
)

echo   [BOOT]    starting the Forge server
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%PY%' -ArgumentList @('%~dp0server.py') -WorkingDirectory '%~dp0' -WindowStyle Hidden -RedirectStandardOutput '%LOGDIR%\forge.out.log' -RedirectStandardError '%LOGDIR%\forge.err.log'" >nul 2>&1

set /a WAIT=0
:waitloop
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "try { $r=Invoke-WebRequest 'http://127.0.0.1:8796/api/status' -UseBasicParsing -TimeoutSec 2; if($r.StatusCode -eq 200){exit 0} } catch {}; exit 1" >nul 2>&1
if not errorlevel 1 goto :ready
set /a WAIT+=1
if %WAIT% GEQ 30 (
  echo   [FAIL]    Forge did not answer after 30 seconds
  echo             check: %LOGDIR%\forge.err.log
  goto :failed
)
timeout /t 1 /nobreak >nul
goto :waitloop

:ready
echo   [OK]      Forge healthy at %URL%
echo.
echo   --------------------------------------------------------------------------
echo     READY
echo       games    18 titles - each with site/ + docs + a Schematic board
echo       assets   2,096 pooled + 5,947 indexed across 5 drives
echo       git      Pull / Sync / Push / Post live on every project
echo       unity    BOOT UNITY on the two Unity titles
echo.
echo     TWO OFFICIAL LAUNCHERS
echo       1. LYGO Agent Manager   boot first  - engine, console, dispatcher
echo       2. LYGO Forge           this window - studio, projects, assets
echo     One brain: engine 11441 -> bridge 8081. Never start a second model.
echo   --------------------------------------------------------------------------
echo.
set "LYGOB=<INSTALL_DIR>\app\LygoBrowser.exe"
if exist "%LYGOB%" ( start "" "%LYGOB%" "%URL%" ) else ( start "" "%URL%" )
:done
echo    Logs: %LOGDIR%
echo   Press any key to close this launcher. The Forge stays running.
pause >nul
exit /b 0

:failed
echo.
echo   Boot aborted.
pause >nul
exit /b 1
