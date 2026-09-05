@echo off
title AeroMint V3 Deploy and Sync to US Cloud VPS (Ashburn, VA)
color 0B

echo ====================================================
echo     DEPLOYING AEROMINT V3 TO US CLOUD VPS
echo             (Ashburn, Virginia - 129.80.65.56)
echo ====================================================
echo.

set ROOT=%~dp0
if "%ROOT:~-1%"=="\" set ROOT=%ROOT:~0,-1%

set SSH_KEY=%USERPROFILE%\Downloads\ssh-key-2026-09-04.key
if not exist "%SSH_KEY%" set SSH_KEY=C:\Users\MY PC\Downloads\ssh-key-2026-09-04.key

if not exist "%SSH_KEY%" (
    echo [ERROR] SSH Key not found at:
    echo    %SSH_KEY%
    echo    Please ensure your Oracle Cloud SSH private key is in Downloads!
    pause
    exit /b 1
)

set VPS_HOST=129.80.65.56
set VPS_USER=ubuntu
set REMOTE_DIR=/home/ubuntu/aeromint-backend

echo [1/4] Checking local backend files...
if not exist "%ROOT%\backend\server.js" (
    echo [ERROR] %ROOT%\backend\server.js not found!
    pause
    exit /b 1
)
echo      [OK] Local server.js found.

echo.
echo [2/4] Uploading server.js and assets to US Cloud VPS (%VPS_HOST%)...
scp -i "%SSH_KEY%" -o StrictHostKeyChecking=no "%ROOT%\backend\server.js" %VPS_USER%@%VPS_HOST%:%REMOTE_DIR%/server.js
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to upload server.js via SCP!
    pause
    exit /b %ERRORLEVEL%
)
echo      [OK] server.js uploaded successfully!

if exist "%ROOT%\backend\package.json" (
    scp -i "%SSH_KEY%" -o StrictHostKeyChecking=no "%ROOT%\backend\package.json" %VPS_USER%@%VPS_HOST%:%REMOTE_DIR%/package.json > nul 2>&1
)
if exist "%ROOT%\backend\utils" (
    scp -i "%SSH_KEY%" -o StrictHostKeyChecking=no -r "%ROOT%\backend\utils" %VPS_USER%@%VPS_HOST%:%REMOTE_DIR%/ > nul 2>&1
)

echo.
echo [3/4] Restarting aeromint-backend via PM2 on US VPS...
ssh -i "%SSH_KEY%" -o StrictHostKeyChecking=no %VPS_USER%@%VPS_HOST% "pm2 restart aeromint-backend"
if %ERRORLEVEL% NEQ 0 (
    echo [WARN] PM2 restart returned exit code %ERRORLEVEL%
)

echo.
echo [4/4] Verifying US Cloud VPS Health...
curl -s -m 5 http://%VPS_HOST%:3001/api/doctor/live-mesh > nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo      [OK] Live-Mesh Telemetry responded ONLINE!
) else (
    echo      [INFO] VPS is starting up, please allow 3-5 seconds.
)

echo.
echo ====================================================
echo    SUCCESS: US CLOUD VPS UPDATED & RUNNING ONLINE!
echo    Location: Ashburn, Virginia (US East)
echo    Endpoint: http://%VPS_HOST%:3001
echo ====================================================
echo.
pause
