@echo off
title AeroMint V3 Universal 1-Click Restore Manager
color 0B
cls

set ROOT=%~dp0
if "%ROOT:~-1%"=="\" set ROOT=%ROOT:~0,-1%
set BACKUP_DIR=%ROOT%\..\old version v3

echo ===================================================================
echo         🔄 AEROMINT V3 UNIVERSAL RESTORE MANAGER 🔄
echo ===================================================================
echo.
echo Available Snapshots in old version v3:
echo.

node "%ROOT%\scripts\list_backups.cjs"

echo.
echo ===================================================================
set /p TARGET_VER="👉 Enter Version Number to restore (or press ENTER to cancel): "
if "%TARGET_VER%"=="" (
    echo [INFO] Restore cancelled.
    pause
    exit /b 0
)

if not exist "%BACKUP_DIR%\%TARGET_VER%" (
    echo.
    echo [ERROR] Backup version [%TARGET_VER%] was not found at:
    echo        %BACKUP_DIR%\%TARGET_VER%
    pause
    exit /b 1
)

echo.
if exist "%BACKUP_DIR%\%TARGET_VER%\RESTORE_THIS_BACKUP.bat" (
    call "%BACKUP_DIR%\%TARGET_VER%\RESTORE_THIS_BACKUP.bat"
) else (
    echo [1/3] Restoring Local PC Codebase from [%TARGET_VER%]...
    robocopy "%BACKUP_DIR%\%TARGET_VER%" "%ROOT%" /E /XD "node_modules" ".git" "dist" > nul
    echo       [OK] PC codebase restored.
    
    echo [2/3] Restoring GitHub and Live Website...
    if exist "%ROOT%\push_to_github.bat" call "%ROOT%\push_to_github.bat" --auto
    
    echo [3/3] Restoring US Cloud VPS...
    if exist "%ROOT%\push_to_vps.bat" call "%ROOT%\push_to_vps.bat" --auto
    
    echo.
    echo ===================================================================
    echo   🎉 SUCCESS: VERSION [%TARGET_VER%] RESTORED ON PC, GITHUB AND VPS!
    echo ===================================================================
    pause
)
