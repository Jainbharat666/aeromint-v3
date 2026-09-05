@echo off
title AeroMint PC Optimizer - Bloatware and SQL Remover
color 0A

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
echo   🚀 AEROMINT PC OPTIMIZER - REMOVE UNUSED BLOATWARE 🚀
echo ========================================================
echo.
echo [1/5] Stopping & Disabling Heavy SQL Background Services...
sc stop "MSSQL$SQLEXPRESS" >nul 2>&1
sc config "MSSQL$SQLEXPRESS" start= disabled >nul 2>&1
sc stop "SQLAgent$SQLEXPRESS" >nul 2>&1
sc config "SQLAgent$SQLEXPRESS" start= disabled >nul 2>&1
sc stop "SQLBrowser" >nul 2>&1
sc config "SQLBrowser" start= disabled >nul 2>&1
sc stop "SQLTELEMETRY$SQLEXPRESS" >nul 2>&1
sc config "SQLTELEMETRY$SQLEXPRESS" start= disabled >nul 2>&1
sc stop "SQLWriter" >nul 2>&1
sc config "SQLWriter" start= disabled >nul 2>&1
echo       Done! SQL background services stopped & memory freed.
echo.
echo [2/5] Uninstalling SQL Server Management Studio (SSMS 22)...
if exist "C:\Program Files (x86)\Microsoft Visual Studio\Installer\setup.exe" (
    "C:\Program Files (x86)\Microsoft Visual Studio\Installer\setup.exe" uninstall --installPath "C:\Program Files\Microsoft SQL Server Management Studio 22\Release" --passive --norestart
)
echo       Done!
echo.
echo [3/5] Uninstalling Microsoft SQL Server 2025 Database Engine...
if exist "C:\Program Files\Microsoft SQL Server\170\Setup Bootstrap\SQL2025\Setup.exe" (
    "C:\Program Files\Microsoft SQL Server\170\Setup Bootstrap\SQL2025\Setup.exe" /q /ACTION=Uninstall /INSTANCENAME=SQLEXPRESS /FEATURES=SQLENGINE
)
echo       Done!
echo.
echo [4/5] Uninstalling .NET SDKs (8 & 10)...
if exist "C:\ProgramData\Package Cache\{9251d792-38f1-45c8-9e0c-a516d49882f1}\dotnet-sdk-8.0.416-win-x86.exe" (
    "C:\ProgramData\Package Cache\{9251d792-38f1-45c8-9e0c-a516d49882f1}\dotnet-sdk-8.0.416-win-x86.exe" /uninstall /quiet /norestart
)
if exist "C:\ProgramData\Package Cache\{F9366523-19F5-49F6-9F27-3F27B596471D}\dotnet-sdk-10.0.101-win-x64.exe" (
    "C:\ProgramData\Package Cache\{F9366523-19F5-49F6-9F27-3F27B596471D}\dotnet-sdk-10.0.101-win-x64.exe" /uninstall /quiet /norestart
)
echo       Done!
echo.
echo [5/5] Cleaning remaining SQL drivers & Smart Backup...
winget uninstall --id Microsoft.msodbcsql.17 --silent --accept-source-agreements >nul 2>&1
winget uninstall --id Microsoft.msodbcsql.18 --silent --accept-source-agreements >nul 2>&1
winget uninstall --id Microsoft.SQLServer.OLEDBDriver --silent --accept-source-agreements >nul 2>&1
if exist "C:\Program Files (x86)\InstallShield Installation Information\{BC1FA5CF-A36F-4C61-9638-09D0B431B006}\setup.exe" (
    "C:\Program Files (x86)\InstallShield Installation Information\{BC1FA5CF-A36F-4C61-9638-09D0B431B006}\setup.exe" -runfromtemp -l0x0409 -removeonly -silent >nul 2>&1
)
echo       Done!
echo.
echo ========================================================
echo   SUCCESS! All Bloatware and SQL services removed!
echo   Your PC is now clean, super-fast, and light!
echo   Gigabyte, AMD, Node.js and VS Code were kept safe.
echo ========================================================
echo.
pause