@echo off
setlocal enabledelayedexpansion

:: ==========================================
::              CONFIGURATION
:: ==========================================

:: 1. Frontend (Next.js)
set "PATH_A=C:\Users\info\Documents\Work\regarded_games"
set "CMD_A=npm run dev"

:: 2. Contracts folder (Anvil is launched from here)
set "PATH_B=C:\Users\info\Documents\Work\regarded_contracts"

:: 3. Indexer (Ponder)
set "PATH_C=C:\Users\info\Documents\Work\regarded_games\indexer"

:: 4. Docusaurus docs
set "PATH_D=C:\Users\info\Documents\Work\regarded_games\docs"
set "CMD_D=npm start"

:: Ponder cache folder to wipe on start
set "FOLDER_TO_DELETE=C:\Users\info\Documents\Work\regarded_games\indexer\.ponder"

:: PostgreSQL
:: Secrets are NOT hardcoded. Set PG_PASS (postgres superuser) and PONDER_PASS
:: in your environment, or drop them in a local, gitignored start.env.bat:
::     set "PG_PASS=your_postgres_password"
::     set "PONDER_PASS=your_ponder_password"
if exist "%~dp0start.env.bat" call "%~dp0start.env.bat"
if not defined PG_PASS (
    echo [ERROR] PG_PASS is not set. Define it in your environment or in start.env.bat
    exit /b 1
)
if not defined PONDER_PASS (
    echo [ERROR] PONDER_PASS is not set. Define it in your environment or in start.env.bat
    exit /b 1
)
set "PG_ADMIN_URL=postgresql://postgres:%PG_PASS%@localhost:5432/postgres"
set "PG_APP_URL=postgresql://postgres:%PG_PASS%@localhost:5432/regarded_games"
set "PSQL_PATH=C:\Program Files\PostgreSQL\18\bin\psql.exe"
set "PONDER_USER=ponder_user"

:: Dual-fork chain assignments (must match src/config/tenants.ts + wagmi.ts)
set "MAINNET_CHAIN_ID=31337"
set "MAINNET_ANVIL_PORT=8545"
set "MAINNET_PONDER_PORT=42069"
set "MAINNET_DB=ponder_fork_mainnet"

set "SEPOLIA_CHAIN_ID=31338"
set "SEPOLIA_ANVIL_PORT=8546"
set "SEPOLIA_PONDER_PORT=42070"
set "SEPOLIA_DB=ponder_fork_sepolia"

ECHO --- Regarded Games: Local Test Environment Setup ---

:: =========================================================================
:: Read environment config from root .env (override from .env.local)
:: =========================================================================

set "APP_ENV="
set "ALCHEMY_KEY="
set "ALCHEMY_BASE_TEMPLATE="
set "ALCHEMY_SEPOLIA_TEMPLATE="
set "DISCOURSE_URL="
set "DISCOURSE_API_KEY="

for /f "usebackq tokens=1,* delims==" %%a in (`findstr /v "^#" "%PATH_A%\.env"`) do (
    if "%%a"=="NEXT_PUBLIC_ENVIRONMENT"                 set "APP_ENV=%%b"
    if "%%a"=="ALCHEMY_API_KEY"             set "ALCHEMY_KEY=%%b"
    if "%%a"=="NEXT_PUBLIC_ALCHEMY_BASE_RPC_URL"        set "ALCHEMY_BASE_TEMPLATE=%%b"
    if "%%a"=="NEXT_PUBLIC_ALCHEMY_BASE_SEPOLIA_RPC_URL" set "ALCHEMY_SEPOLIA_TEMPLATE=%%b"
    if "%%a"=="NEXT_PUBLIC_DISCOURSE_URL"               set "DISCOURSE_URL=%%b"
    if "%%a"=="DISCOURSE_API_KEY"                       set "DISCOURSE_API_KEY=%%b"
)

:: .env.local overrides .env (only for the keys we care about)
if exist "%PATH_A%\.env.local" (
    for /f "usebackq tokens=1,* delims==" %%a in (`findstr /v "^#" "%PATH_A%\.env.local"`) do (
        if "%%a"=="NEXT_PUBLIC_ENVIRONMENT"                 set "APP_ENV=%%b"
        if "%%a"=="ALCHEMY_API_KEY"             set "ALCHEMY_KEY=%%b"
        if "%%a"=="NEXT_PUBLIC_ALCHEMY_BASE_RPC_URL"        set "ALCHEMY_BASE_TEMPLATE=%%b"
        if "%%a"=="NEXT_PUBLIC_ALCHEMY_BASE_SEPOLIA_RPC_URL" set "ALCHEMY_SEPOLIA_TEMPLATE=%%b"
        if "%%a"=="NEXT_PUBLIC_DISCOURSE_URL"               set "DISCOURSE_URL=%%b"
        if "%%a"=="DISCOURSE_API_KEY"                       set "DISCOURSE_API_KEY=%%b"
    )
)

:: Fork block numbers — edit these directly to bump the fork point.
:: Anvil forks at this block; Ponder starts indexing from this block.
set "PONDER_START_BLOCK_MAINNET=47800000"
set "PONDER_START_BLOCK_SEPOLIA=42059900"

ECHO Environment: !APP_ENV!

:: =========================================================================
:: Resolve Alchemy RPC URLs (expand ${ALCHEMY_API_KEY} placeholder)
:: =========================================================================

call set "ALCHEMY_BASE_URL=%%ALCHEMY_BASE_TEMPLATE:${ALCHEMY_API_KEY}=%ALCHEMY_KEY%%%"
call set "ALCHEMY_SEPOLIA_URL=%%ALCHEMY_SEPOLIA_TEMPLATE:${ALCHEMY_API_KEY}=%ALCHEMY_KEY%%%"

:: =========================================================================
:: Delete Ponder cache folder
:: =========================================================================

if exist "!FOLDER_TO_DELETE!" (
    ECHO Deleting Ponder cache: !FOLDER_TO_DELETE!
    rmdir /s /q "!FOLDER_TO_DELETE!"
)

:: =========================================================================
:: Pre-flight: kill anything listening on our managed ports
:: =========================================================================

ECHO.
ECHO --- Freeing managed ports (8545, 8546, 42069, 42070) ---
call :KILL_PORT 8545
call :KILL_PORT 8546
call :KILL_PORT 42069
call :KILL_PORT 42070

:: =========================================================================
:: Discourse (local community forum) — ensure it is running
::
:: Discourse runs as the "app" Docker container inside WSL2 (Ubuntu), reachable
:: at http://community.localhost. The "WSL Discourse Keepalive" scheduled task
:: normally keeps it up at logon (it also maintains the 127.0.0.1:{80,2222}
:: portproxy bridge). The two commands below are a belt-and-suspenders start so
:: the forum is up whenever you launch the dev environment.
::   - docker start app : container has restart=always, this is just insurance
::   - schtasks /Run     : (re)applies the portproxy bridge; ignored if already running
:: =========================================================================

ECHO.
ECHO --- Ensuring Discourse (WSL2 container 'app') is running ---
wsl -d Ubuntu -u root -- bash -lc "systemctl start docker 2>/dev/null; docker start app >/dev/null 2>&1; true"
schtasks /Run /TN "WSL Discourse Keepalive" >nul 2>&1
ECHO Discourse: http://community.localhost  (allow ~30s for the web to finish booting)

echo.
echo [Step 2] Launching terminals...

:: =========================================================================
:: Frontend (always)
:: =========================================================================

echo Starting frontend...
start "Frontend (NPM)" cmd /k "cd /d "%PATH_A%" && %CMD_A%"

:: =========================================================================
:: Docs (always)
:: =========================================================================

echo Starting docs...
start "Docs (Docusaurus)" cmd /k "cd /d "%PATH_D%" && %CMD_D%"

:: =========================================================================
:: fork  →  Two Anvils + Two Ponders running in parallel
::   Anvil A  (Base mainnet fork)  : chain !MAINNET_CHAIN_ID!, port !MAINNET_ANVIL_PORT!
::   Anvil B  (Base Sepolia fork)  : chain !SEPOLIA_CHAIN_ID!, port !SEPOLIA_ANVIL_PORT!
::   Ponder A (mainnet contracts)  : port !MAINNET_PONDER_PORT!, db !MAINNET_DB!
::   Ponder B (sepolia contracts)  : port !SEPOLIA_PONDER_PORT!, db !SEPOLIA_DB!
:: =========================================================================

if /i "!APP_ENV!"=="fork" (

    ECHO fork mode: launching dual Anvil + dual Ponder.

    :: --- DB setup: drop and recreate both Ponder DBs ---
    ECHO Dropping and recreating: !MAINNET_DB!
    "%PSQL_PATH%" "%PG_ADMIN_URL%" -c "DROP DATABASE IF EXISTS !MAINNET_DB! WITH (FORCE);"
    "%PSQL_PATH%" "%PG_ADMIN_URL%" -c "CREATE DATABASE !MAINNET_DB! OWNER %PONDER_USER%;"

    ECHO Dropping and recreating: !SEPOLIA_DB!
    "%PSQL_PATH%" "%PG_ADMIN_URL%" -c "DROP DATABASE IF EXISTS !SEPOLIA_DB! WITH (FORCE);"
    "%PSQL_PATH%" "%PG_ADMIN_URL%" -c "CREATE DATABASE !SEPOLIA_DB! OWNER %PONDER_USER%;"

    :: --- Discourse: delete the manifest vote topic (if one was registered) ---
    if not "!DISCOURSE_URL!"=="" if not "!DISCOURSE_API_KEY!"=="" (
        for /f "usebackq tokens=1 delims= " %%T in (`"%PSQL_PATH%" "%PG_APP_URL%" -t -A -c "SELECT value FROM quest_config WHERE key='manifest_topic_id';" 2^>nul`) do set "DISCOURSE_TOPIC_ID=%%T"
        if not "!DISCOURSE_TOPIC_ID!"=="" (
            ECHO Deleting Discourse topic !DISCOURSE_TOPIC_ID!...
            curl.exe -s -X DELETE "!DISCOURSE_URL!/t/!DISCOURSE_TOPIC_ID!.json" -H "Api-Key: !DISCOURSE_API_KEY!" -H "Api-Username: system" >nul
            set "DISCOURSE_TOPIC_ID="
        )
    )

    :: --- App DB: clear transient tables in regarded_games ---
    ECHO Clearing faucet_referrals, quest_completions, quest_config in regarded_games...
    "%PSQL_PATH%" "%PG_APP_URL%" -c "TRUNCATE TABLE faucet_referrals, quest_completions, quest_config RESTART IDENTITY CASCADE;"

    :: --- Anvil A: Base mainnet fork ---
    set "ANVIL_CMD_M=anvil --fork-url !ALCHEMY_BASE_URL! --fork-block-number !PONDER_START_BLOCK_MAINNET! --chain-id !MAINNET_CHAIN_ID! --port !MAINNET_ANVIL_PORT!"
    echo Starting Anvil ^(Base mainnet fork, port !MAINNET_ANVIL_PORT!, chain !MAINNET_CHAIN_ID!, block !PONDER_START_BLOCK_MAINNET!^)...
    start "Anvil (mainnet fork)" cmd /k "cd /d "%PATH_B%" && !ANVIL_CMD_M!"

    :: --- Anvil B: Base Sepolia fork ---  --block-time 2
    set "ANVIL_CMD_S=anvil --fork-url !ALCHEMY_SEPOLIA_URL! --fork-block-number !PONDER_START_BLOCK_SEPOLIA! --chain-id !SEPOLIA_CHAIN_ID! --port !SEPOLIA_ANVIL_PORT!"
    echo Starting Anvil ^(Base Sepolia fork, port !SEPOLIA_ANVIL_PORT!, chain !SEPOLIA_CHAIN_ID!, block !PONDER_START_BLOCK_SEPOLIA!^)...
    start "Anvil (sepolia fork)" cmd /k "cd /d "%PATH_B%" && !ANVIL_CMD_S!"

    :: --- Ponder A: mainnet contracts ---
    set "DB_URL_M=postgresql://%PONDER_USER%:%PONDER_PASS%@localhost:5432/!MAINNET_DB!"
    echo Starting Ponder ^(mainnet contracts, port !MAINNET_PONDER_PORT!^)...
    start "Ponder (mainnet)" cmd /k "cd /d "%PATH_C%"&& set PONDER_DEPLOYMENT=mainnet&& set PONDER_CHAIN_ID=!MAINNET_CHAIN_ID!&& set PONDER_RPC_URL=http://127.0.0.1:!MAINNET_ANVIL_PORT!&& set DATABASE_URL=!DB_URL_M!&& set QUEST_DATABASE_URL=%PG_APP_URL%&& set PONDER_START_BLOCK=!PONDER_START_BLOCK_MAINNET!&& npm run dev -- --port !MAINNET_PONDER_PORT!"

    :: --- Ponder B: sepolia contracts ---
    set "DB_URL_S=postgresql://%PONDER_USER%:%PONDER_PASS%@localhost:5432/!SEPOLIA_DB!"
    echo Starting Ponder ^(sepolia contracts, port !SEPOLIA_PONDER_PORT!^)...
    start "Ponder (sepolia)" cmd /k "cd /d "%PATH_C%"&& set PONDER_DEPLOYMENT=sepolia&& set PONDER_CHAIN_ID=!SEPOLIA_CHAIN_ID!&& set PONDER_RPC_URL=http://127.0.0.1:!SEPOLIA_ANVIL_PORT!&& set DATABASE_URL=!DB_URL_S!&& set QUEST_DATABASE_URL=%PG_APP_URL%&& set PONDER_START_BLOCK=!PONDER_START_BLOCK_SEPOLIA!&& npm run dev -- --port !SEPOLIA_PONDER_PORT!"

    goto done
)

:: =========================================================================
:: mainnet  →  no local Anvil or Ponder
:: =========================================================================

ECHO Mainnet mode: no local Anvil or Ponder.
ECHO Set NEXT_PUBLIC_PONDER_URL_MAINNET / _SEPOLIA in .env.local to your deployed Ponder endpoints.

:done
echo.
echo All processes started!
endlocal
goto :eof

:: =========================================================================
:: :KILL_PORT <port>  — find every PID listening on <port> and force-kill it.
:: Uses findstr /R ":<port> " so we don't accidentally match :<port>X.
:: =========================================================================

:KILL_PORT
set "_PORT=%~1"
for /f "tokens=5" %%P in ('netstat -ano ^| findstr "LISTENING" ^| findstr /R ":%_PORT% "') do (
    ECHO   Killing PID %%P on port %_PORT%
    taskkill /PID %%P /F >nul 2>&1
)
exit /b 0
