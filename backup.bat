@echo off
title AeroMint V3 Intelligent Hybrid Backup Generator (PC and US VPS)
color 0A

echo ===================================================================
echo     AEROMINT V3 HYBRID BACKUP GENERATOR (PC + US CLOUD VPS)
echo ===================================================================
echo.

node "%~dp0scripts\create_backup.cjs"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Backup process exited with code %ERRORLEVEL%
)

echo.
pause
