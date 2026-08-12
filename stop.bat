@echo off
setlocal enabledelayedexpansion

:: Elevated helper: when this script is re-invoked with this sentinel arg (via a
:: UAC prompt), jump straight to the admin-only block and do nothing else.
if /i "%~1"=="__admin_shutdown" goto ADMIN_SHUTDOWN

:: ==========================================
::   Regarded Games - stop the local env
::   Counterpart to start.bat
:: ==========================================

ECHO --- Regarded Games: Stopping Local Test Environment ---

:: =========================================================================
:: Discourse (local community forum, WSL2 container 'app')
::   - End the keepalive task's current instance, then disable it (below, in the
::     elevated block) so it does NOT re-start the container at the next logon.
::   - docker stop overrides restart=always, so the container stays stopped.
::   - wsl --shutdown collapses the WSL2 VM afterwards to free its RAM.
:: =========================================================================
ECHO.
ECHO --- Stopping Discourse (WSL2 container 'app') ---
schtasks /End /TN "WSL Discourse Keepalive" >nul 2>&1
wsl -d Ubuntu -u root -- bash -lc "docker stop app >/dev/null 2>&1; true"
ECHO Discourse container stopped.

:: =========================================================================
:: Admin-only teardown (needs Administrator rights):
::   - Stop the PostgreSQL service and set it to Manual start (no auto-start
::     at boot). NOTE: this is the machine-wide Postgres — if other projects
::     rely on it, they will be stopped too.
::   - Disable the "WSL Discourse Keepalive" logon task so nothing re-launches
::     WSL/Discourse the next time you sign in.
:: We re-launch just this script's :ADMIN_SHUTDOWN block elevated -> one UAC
:: prompt. Click Yes. (No prompt appears if you already ran stop.bat as admin.)
:: =========================================================================
ECHO.
ECHO --- Disabling auto-start: Postgres + Discourse keepalive [approve UAC] ---
powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -ArgumentList '__admin_shutdown' -Verb RunAs -Wait"

:: =========================================================================
:: Collapse the WSL2 VM to free its memory (no admin needed).
:: =========================================================================
ECHO.
ECHO --- Shutting down WSL2 (frees the Discourse VM's RAM) ---
wsl --shutdown
ECHO Discourse + WSL stopped.

:: =========================================================================
:: Anvil + Ponder - kill anything listening on the managed ports
:: =========================================================================
ECHO.
ECHO --- Stopping Anvil + Ponder (ports 8545, 8546, 42069, 42070) ---
call :KILL_PORT 8545
call :KILL_PORT 8546
call :KILL_PORT 42069
call :KILL_PORT 42070

:: =========================================================================
:: Frontend + Docs - close the cmd windows start.bat opened (by title)
:: =========================================================================
ECHO.
ECHO --- Closing Frontend + Docs windows ---
call :KILL_WINDOW "Frontend (NPM)"
call :KILL_WINDOW "Docs (Docusaurus)"
:: Fallbacks in case the windows were renamed by the running process.
call :KILL_PORT 3000
call :KILL_PORT 3001

echo.
echo All stopped. (Dev stack, Discourse, WSL, and Postgres are all down; nothing auto-restarts until you run start.bat.)
endlocal
goto :eof

:: =========================================================================
:: :KILL_PORT <port>  - force-kill every PID listening on <port>.
:: =========================================================================
:KILL_PORT
set "_PORT=%~1"
for /f "tokens=5" %%P in ('netstat -ano ^| findstr "LISTENING" ^| findstr /R ":%_PORT% "') do (
    ECHO   Killing PID %%P on port %_PORT%
    taskkill /PID %%P /F >nul 2>&1
)
exit /b 0

:: =========================================================================
:: :KILL_WINDOW <title>  - close a cmd window started with that title.
:: =========================================================================
:KILL_WINDOW
taskkill /FI "WINDOWTITLE eq %~1*" /T /F >nul 2>&1
if not errorlevel 1 ECHO   Closed window: %~1
exit /b 0

:: =========================================================================
:: :ADMIN_SHUTDOWN  - runs elevated (re-invoked via UAC from the top of the
:: script). Stops Postgres, sets it to Manual start, and disables the logon
:: keepalive so nothing project-related auto-returns at boot or logon.
:: =========================================================================
:ADMIN_SHUTDOWN
echo [admin] Stopping PostgreSQL service...
net stop postgresql-x64-18
echo [admin] Setting PostgreSQL to Manual start (no auto-start at boot)...
sc config postgresql-x64-18 start= demand
echo [admin] Disabling the WSL Discourse Keepalive logon task...
schtasks /Change /TN "WSL Discourse Keepalive" /DISABLE
exit /b 0
