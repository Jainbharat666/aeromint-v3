@echo off
title AeroMint Core Engine Lock Verifier
color 0B
echo ====================================================
echo    🔒 VERIFYING AEROMINT CORE ENGINE INTEGRITY...
echo ====================================================
echo.
cd /d "%~dp0"
node verify_core_integrity.cjs
echo.
pause
