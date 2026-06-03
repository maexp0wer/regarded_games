@echo off
setlocal enabledelayedexpansion

:: ==========================================
::   Ritardo Games - stop the local env
::   Counterpart to start.bat
:: ==========================================

ECHO --- Ritardo Games: Stopping Local Test Environment ---

:: =========================================================================
:: Discourse (local community forum, WSL2 container 'app')
::   - End the keepalive task so it doesn't immediately re-start the container
::     (it will start again at next logon, or when you run start.bat).
::   - docker stop overrides restart=always, so the container stays stopped.
:: =========================================================================
ECHO.
ECHO --- Stopping Discourse (WSL2 container 'app') ---
schtasks /End /TN "WSL Discourse Keepalive" >nul 2>&1
wsl -d Ubuntu -u root -- bash -lc "docker stop app >/dev/null 2>&1; true"
ECHO Discourse stopped.

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
echo All stopped. (WSL itself is left running; use 'wsl --shutdown' to stop it too.)
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
