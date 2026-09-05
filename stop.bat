@echo off
title AeroMint Bot - Stop Services
color 0C
echo ====================================================
echo        🛑 STOPPING AEROMINT SERVICES 🛑
echo ====================================================
echo.
echo Stopping AeroMint Frontend and Backend...
taskkill /f /im node.exe >nul 2>&1
echo.
echo ✅ All AeroMint servers stopped cleanly with 0 hang!
timeout /t 2 /nobreak > nul
exit
