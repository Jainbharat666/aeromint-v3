@echo off
title AeroMint V3 Local Dev Launcher
color 0B
echo ====================================================
echo        🚀 AEROMINT VERSION 3 LAUNCHER 🚀
echo ====================================================
echo.

set ROOT=%~dp0

:: Check Backend node_modules
if not exist "%ROOT%backend\node_modules" (
    echo [1/3] Installing Backend packages...
    cd /d "%ROOT%backend"
    call npm install
)

:: Check Frontend node_modules
if not exist "%ROOT%node_modules" (
    echo [2/3] Installing Frontend packages...
    cd /d "%ROOT%"
    call npm install
)

echo [3/3] Starting Local Backend & Frontend...

:: Start Backend on Port 3001
start "AeroMint V3 Backend (:3001)" cmd /k "cd /d %ROOT%backend && title AeroMint V3 Backend (:3001) && npm start"

:: Start Frontend on Port 5173
start "AeroMint V3 Frontend (:5173)" cmd /k "cd /d %ROOT% && title AeroMint V3 Frontend (:5173) && npm run dev"

:: Wait for Vite dev server to bind port
timeout /t 3 /nobreak > nul

:: Open Browser to Localhost
start http://localhost:5173

echo.
echo ====================================================
echo    ✅ AeroMint is now running locally at:
echo    👉 http://localhost:5173
echo.
echo    💡 To stop all servers anytime, run stop.bat!
echo ====================================================
echo.
timeout /t 3 /nobreak > nul
exit
