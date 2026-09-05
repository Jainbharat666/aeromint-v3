@echo off
title Restore AeroMint Core Engine
color 0C
echo ====================================================
echo   ⚠️ RESTORING AEROMINT TO VERIFIED GOLDEN CORE...
echo ====================================================
echo.
cd /d "%~dp0"
copy /Y "core_engine_lock\GOLDEN_App.jsx" "src\App.jsx"
copy /Y "core_engine_lock\GOLDEN_App.jsx" "frontend\src\App.jsx"
copy /Y "core_engine_lock\GOLDEN_server.js" "backend\server.js"
echo.
echo [OK] Core files restored from Golden Snapshot!
echo.
echo Running integrity check...
node verify_core_integrity.cjs
echo.
pause
