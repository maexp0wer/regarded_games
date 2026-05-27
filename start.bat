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

:: Read per-chain start blocks from indexer/.env.local (optional)
set "PONDER_START_BLOCK_MAINNET=0"
set "PONDER_START_BLOCK_TESTNET=0"
if exist "%PATH_C%\.env.local" (
    for /f "usebackq tokens=1,* delims==" %%a in (`findstr /v "^#" "%PATH_C%\.env.local"`) do (
        if "%%a"=="PONDER_START_BLOCK_MAINNET" set "PONDER_START_BLOCK_MAINNET=%%b"
        if "%%a"=="PONDER_START_BLOCK_TESTNET" set "PONDER_START_BLOCK_TESTNET=%%b"
    )
)

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
:: Database setup  (only needed for fork modes — one DB either way)
:: =========================================================================

ECHO.
ECHO --- Database Setup ---

if /i "!APP_ENV!"=="fork-mainnet" (
    ECHO Dropping and recreating: ponder_main
    "%PSQL_PATH%" "%PG_ADMIN_URL%" -c "DROP DATABASE IF EXISTS ponder_main WITH (FORCE);"
    "%PSQL_PATH%" "%PG_ADMIN_URL%" -c "CREATE DATABASE ponder_main OWNER %PONDER_USER%;"
) else if /i "!APP_ENV!"=="fork-sepolia" (
    ECHO Dropping and recreating: ponder_main
    "%PSQL_PATH%" "%PG_ADMIN_URL%" -c "DROP DATABASE IF EXISTS ponder_main WITH (FORCE);"
    "%PSQL_PATH%" "%PG_ADMIN_URL%" -c "CREATE DATABASE ponder_main OWNER %PONDER_USER%;"
) else (
    ECHO Mainnet mode: skipping local DB setup ^(no local Ponder^).
)

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
:: fork-mainnet  →  Anvil (fork of Base mainnet, chain 31337) + Ponder (mainnet contracts)
:: =========================================================================

if /i "!APP_ENV!"=="fork-mainnet" (

    ECHO fork-mainnet: starting Anvil ^(Base mainnet fork, chain 31337^) + Ponder.

    set "ANVIL_CMD=anvil --fork-url !ALCHEMY_BASE_URL! --fork-block-number !PONDER_START_BLOCK_MAINNET! --chain-id 31337 --port 8545"
    echo Starting Anvil ^(Base mainnet fork, port 8545, chain 31337, block !PONDER_START_BLOCK_MAINNET!^)...
    start "Anvil (mainnet fork)" cmd /k "cd /d "%PATH_B%" && !ANVIL_CMD!"

    set "DB_URL=postgresql://%PONDER_USER%:%PONDER_PASS%@localhost:5432/ponder_main"
    echo Starting Ponder ^(mainnet contracts, port 42069^)...
    start "Ponder" cmd /k "cd /d "%PATH_C%"&& set PONDER_CHAIN_ID=8453&& set PONDER_RPC_URL_31337=http://127.0.0.1:8545&& set DATABASE_URL=!DB_URL!&& set PONDER_START_BLOCK=!PONDER_START_BLOCK_MAINNET!&& npm run dev"

    goto done
)

:: =========================================================================
:: fork-sepolia  →  Anvil (fork of Base Sepolia, chain 31337) + Ponder (testnet contracts)
:: =========================================================================

if /i "!APP_ENV!"=="fork-sepolia" (

    ECHO fork-sepolia: starting Anvil ^(Base Sepolia fork, chain 31337^) + Ponder.

    set "ANVIL_CMD=anvil --fork-url !ALCHEMY_SEPOLIA_URL! --fork-block-number !PONDER_START_BLOCK_TESTNET! --chain-id 31337 --port 8545"
    echo Starting Anvil ^(Base Sepolia fork, port 8545, chain 31337, block !PONDER_START_BLOCK_TESTNET!^)...
    start "Anvil (sepolia fork)" cmd /k "cd /d "%PATH_B%" && !ANVIL_CMD!"

    set "DB_URL=postgresql://%PONDER_USER%:%PONDER_PASS%@localhost:5432/ponder_main"
    echo Starting Ponder ^(testnet contracts, port 42069^)...
    start "Ponder" cmd /k "cd /d "%PATH_C%"&& set PONDER_CHAIN_ID=84532&& set PONDER_RPC_URL_31337=http://127.0.0.1:8545&& set DATABASE_URL=!DB_URL!&& set PONDER_START_BLOCK=!PONDER_START_BLOCK_TESTNET!&& npm run dev"

    goto done
)

:: =========================================================================
:: mainnet  →  no local Anvil or Ponder
:: =========================================================================

ECHO Mainnet mode: no local Anvil or Ponder.
ECHO Set NEXT_PUBLIC_PONDER_URL_MAINNET / _TESTNET in .env.local to your deployed Ponder endpoints.

:done
echo.
echo All processes started!
endlocal
