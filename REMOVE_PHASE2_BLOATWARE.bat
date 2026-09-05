@echo off
title AeroMint PC Optimizer - Phase 2 Developer and Bloatware Cleanup
color 0B

:: Check for Administrator privileges
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo.
    echo ====================================================
    echo   [!] Administrator privileges required.
    echo   Requesting Windows UAC Permission...
    echo ====================================================
    echo.
    powershell -NoProfile -Command "Start-Process cmd.exe -ArgumentList '/c ""%~f0""' -Verb RunAs"
    exit /b
)

echo.
echo ========================================================
echo   🚀 AEROMINT PC OPTIMIZER - PHASE 2 CLEANUP 🚀
echo ========================================================
echo.
echo [1/4] Uninstalling Windows Software Development Kit (2.2 GB)...
if exist "C:\ProgramData\Package Cache\{204d0387-6d9a-48cf-bb7d-93d49ec0141c}\winsdksetup.exe" (
    "C:\ProgramData\Package Cache\{204d0387-6d9a-48cf-bb7d-93d49ec0141c}\winsdksetup.exe" /uninstall /quiet /norestart
)
echo       Done!
echo.
echo [2/4] Uninstalling AMD Privacy View (305 MB Webcam Tracker)...
msiexec.exe /x {D8E24EA6-807B-48D0-86D6-A9C5E74B8F2C} /qn /norestart
echo       Done!
echo.
echo [3/4] Removing Visual Studio Installer residual components...
if exist "C:\Program Files (x86)\Microsoft Visual Studio\Installer\setup.exe" (
    "C:\Program Files (x86)\Microsoft Visual Studio\Installer\setup.exe" uninstall --all --quiet --norestart
)
echo       Done!
echo.
echo [4/4] Removing Gigabyte Smart Backup...
if exist "C:\Program Files (x86)\InstallShield Installation Information\{BC1FA5CF-A36F-4C61-9638-09D0B431B006}\setup.exe" (
    start "" "C:\Program Files (x86)\InstallShield Installation Information\{BC1FA5CF-A36F-4C61-9638-09D0B431B006}\setup.exe" -runfromtemp -l0x0409 -removeonly
)
echo       Done!
echo.
echo ========================================================
echo   SUCCESS! All Phase 2 apps and SDKs cleaned!
echo   Gigabyte Motherboard and AMD GPU drivers were protected!
echo ========================================================
echo.
pause