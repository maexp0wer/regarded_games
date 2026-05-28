@echo off
setlocal enabledelayedexpansion

:: ==========================================
::              CONFIGURATION
:: ==========================================

:: 1. Frontend (Next.js)
set "PATH_A=C:\Users\info\Documents\Work\ritardo_games"
set "CMD_A=npm run dev"

:: 2. Contracts folder (Anvil is launched from here)
set "PATH_B=C:\Users\info\Documents\Work\ritardo_contracts"

:: 3. Indexer (Ponder)
set "PATH_C=C:\Users\info\Documents\Work\ritardo_games\indexer"

:: 4. Docusaurus docs
set "PATH_D=C:\Users\info\Documents\Work\ritardo_games\docs"
set "CMD_D=npm start"

:: Ponder cache folder to wipe on start
set "FOLDER_TO_DELETE=C:\Users\info\Documents\Work\ritardo_games\indexer\.ponder"

:: PostgreSQL
set "PG_ADMIN_URL=postgresql://postgres:***REMOVED***@localhost:5432/postgres"
set "PSQL_PATH=C:\Program Files\PostgreSQL\18\bin\psql.exe"
set "PONDER_USER=ponder_user"
set "PONDER_PASS=***REMOVED***"

:: Dual-fork chain assignments (must match src/config/tenants.ts + wagmi.ts)
set "MAINNET_CHAIN_ID=31337"
set "MAINNET_ANVIL_PORT=8545"
set "MAINNET_PONDER_PORT=42069"
set "MAINNET_DB=ponder_fork_mainnet"

set "SEPOLIA_CHAIN_ID=31338"
set "SEPOLIA_ANVIL_PORT=8546"
set "SEPOLIA_PONDER_PORT=42070"
set "SEPOLIA_DB=ponder_fork_sepolia"

ECHO --- Ritardo Games: Local Test Environment Setup ---

:: =========================================================================
:: Read environment config from root .env (override from .env.local)
:: =========================================================================

set "APP_ENV="
set "ALCHEMY_KEY="
set "ALCHEMY_BASE_TEMPLATE="
set "ALCHEMY_SEPOLIA_TEMPLATE="

for /f "usebackq tokens=1,* delims==" %%a in (`findstr /v "^#" "%PATH_A%\.env"`) do (
    if "%%a"=="NEXT_PUBLIC_ENVIRONMENT"                 set "APP_ENV=%%b"
    if "%%a"=="NEXT_PUBLIC_ALCHEMY_API_KEY"             set "ALCHEMY_KEY=%%b"
    if "%%a"=="NEXT_PUBLIC_ALCHEMY_BASE_RPC_URL"        set "ALCHEMY_BASE_TEMPLATE=%%b"
    if "%%a"=="NEXT_PUBLIC_ALCHEMY_BASE_SEPOLIA_RPC_URL" set "ALCHEMY_SEPOLIA_TEMPLATE=%%b"
)

:: .env.local overrides .env (only for the keys we care about)
if exist "%PATH_A%\.env.local" (
    for /f "usebackq tokens=1,* delims==" %%a in (`findstr /v "^#" "%PATH_A%\.env.local"`) do (
        if "%%a"=="NEXT_PUBLIC_ENVIRONMENT"                 set "APP_ENV=%%b"
        if "%%a"=="NEXT_PUBLIC_ALCHEMY_API_KEY"             set "ALCHEMY_KEY=%%b"
        if "%%a"=="NEXT_PUBLIC_ALCHEMY_BASE_RPC_URL"        set "ALCHEMY_BASE_TEMPLATE=%%b"
        if "%%a"=="NEXT_PUBLIC_ALCHEMY_BASE_SEPOLIA_RPC_URL" set "ALCHEMY_SEPOLIA_TEMPLATE=%%b"
    )
)

:: Fork block numbers — edit these directly to bump the fork point.
:: Anvil forks at this block; Ponder starts indexing from this block.
set "PONDER_START_BLOCK_MAINNET=45689000"
set "PONDER_START_BLOCK_SEPOLIA=42059900"

ECHO Environment: !APP_ENV!

:: =========================================================================
:: Resolve Alchemy RPC URLs (expand ${NEXT_PUBLIC_ALCHEMY_API_KEY} placeholder)
:: =========================================================================

call set "ALCHEMY_BASE_URL=%%ALCHEMY_BASE_TEMPLATE:${NEXT_PUBLIC_ALCHEMY_API_KEY}=%ALCHEMY_KEY%%%"
call set "ALCHEMY_SEPOLIA_URL=%%ALCHEMY_SEPOLIA_TEMPLATE:${NEXT_PUBLIC_ALCHEMY_API_KEY}=%ALCHEMY_KEY%%%"

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

    :: --- DB setup: drop and recreate both ---
    ECHO Dropping and recreating: !MAINNET_DB!
    "%PSQL_PATH%" "%PG_ADMIN_URL%" -c "DROP DATABASE IF EXISTS !MAINNET_DB! WITH (FORCE);"
    "%PSQL_PATH%" "%PG_ADMIN_URL%" -c "CREATE DATABASE !MAINNET_DB! OWNER %PONDER_USER%;"

    ECHO Dropping and recreating: !SEPOLIA_DB!
    "%PSQL_PATH%" "%PG_ADMIN_URL%" -c "DROP DATABASE IF EXISTS !SEPOLIA_DB! WITH (FORCE);"
    "%PSQL_PATH%" "%PG_ADMIN_URL%" -c "CREATE DATABASE !SEPOLIA_DB! OWNER %PONDER_USER%;"

    :: --- Anvil A: Base mainnet fork ---
    set "ANVIL_CMD_M=anvil --fork-url !ALCHEMY_BASE_URL! --fork-block-number !PONDER_START_BLOCK_MAINNET! --chain-id !MAINNET_CHAIN_ID! --port !MAINNET_ANVIL_PORT!"
    echo Starting Anvil ^(Base mainnet fork, port !MAINNET_ANVIL_PORT!, chain !MAINNET_CHAIN_ID!, block !PONDER_START_BLOCK_MAINNET!^)...
    start "Anvil (mainnet fork)" cmd /k "cd /d "%PATH_B%" && !ANVIL_CMD_M!"

    :: --- Anvil B: Base Sepolia fork ---
    set "ANVIL_CMD_S=anvil --fork-url !ALCHEMY_SEPOLIA_URL! --fork-block-number !PONDER_START_BLOCK_SEPOLIA! --chain-id !SEPOLIA_CHAIN_ID! --port !SEPOLIA_ANVIL_PORT!"
    echo Starting Anvil ^(Base Sepolia fork, port !SEPOLIA_ANVIL_PORT!, chain !SEPOLIA_CHAIN_ID!, block !PONDER_START_BLOCK_SEPOLIA!^)...
    start "Anvil (sepolia fork)" cmd /k "cd /d "%PATH_B%" && !ANVIL_CMD_S!"

    :: --- Ponder A: mainnet contracts ---
    set "DB_URL_M=postgresql://%PONDER_USER%:%PONDER_PASS%@localhost:5432/!MAINNET_DB!"
    echo Starting Ponder ^(mainnet contracts, port !MAINNET_PONDER_PORT!^)...
    start "Ponder (mainnet)" cmd /k "cd /d "%PATH_C%"&& set PONDER_DEPLOYMENT=mainnet&& set PONDER_CHAIN_ID=!MAINNET_CHAIN_ID!&& set PONDER_RPC_URL=http://127.0.0.1:!MAINNET_ANVIL_PORT!&& set DATABASE_URL=!DB_URL_M!&& set PONDER_START_BLOCK=!PONDER_START_BLOCK_MAINNET!&& npm run dev -- --port !MAINNET_PONDER_PORT!"

    :: --- Ponder B: sepolia contracts ---
    set "DB_URL_S=postgresql://%PONDER_USER%:%PONDER_PASS%@localhost:5432/!SEPOLIA_DB!"
    echo Starting Ponder ^(sepolia contracts, port !SEPOLIA_PONDER_PORT!^)...
    start "Ponder (sepolia)" cmd /k "cd /d "%PATH_C%"&& set PONDER_DEPLOYMENT=sepolia&& set PONDER_CHAIN_ID=!SEPOLIA_CHAIN_ID!&& set PONDER_RPC_URL=http://127.0.0.1:!SEPOLIA_ANVIL_PORT!&& set DATABASE_URL=!DB_URL_S!&& set PONDER_START_BLOCK=!PONDER_START_BLOCK_SEPOLIA!&& npm run dev -- --port !SEPOLIA_PONDER_PORT!"

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
