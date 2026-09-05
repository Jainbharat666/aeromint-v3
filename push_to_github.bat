@echo off
title Push AeroMint V3 to GitHub
color 0A
echo ====================================================
echo      🚀 PUSHING AEROMINT V3 CODE TO GITHUB... 🚀
echo ====================================================
echo.
cd /d "%~dp0"

:: Step 1: Auto-Sync root src to frontend/src folder before pushing
echo [1/7] Auto-syncing root src/ & public/ to frontend/...
if exist "frontend\src" (
    xcopy /E /Y /I "src\*" "frontend\src\" >nul
    if exist "public" xcopy /E /Y /I "public\*" "frontend\public\" >nul
    if exist "index.html" copy /Y "index.html" "frontend\index.html" >nul
    if exist "vite.config.js" copy /Y "vite.config.js" "frontend\vite.config.js" >nul
    echo      Done! Frontend synced perfectly.
)

:: Step 2: Initialize git repo if not already done
if not exist ".git" (
    echo [2/7] Initializing git repository...
    git init
    echo      Done!
) else (
    echo [2/7] Git repo already initialized. Skipping init.
)

:: Step 3: Set git identity
echo [3/7] Setting git identity...
git config user.email "jainbharat666@gmail.com"
git config user.name "Jainbharat666"

:: Step 4: Set remote origin to aeromint-v3
echo [4/7] Setting remote origin to aeromint-v3...
set GHTOKEN=
if exist "%~dp0.git_token" set /p GHTOKEN=<"%~dp0.git_token"
if "%GHTOKEN%"=="" (
    echo [ERROR] .git_token file not found!
    pause
    exit /b 1
)
git remote remove origin 2>nul
git remote add origin https://Jainbharat666:%GHTOKEN%@github.com/Jainbharat666/aeromint-v3.git

:: Step 5: Stage all changes
echo [5/7] Staging all changes...
git add .

:: Step 6: Commit with timestamp
echo [6/7] Committing...
git commit -m "AeroMint V3 Full Sync Release - %DATE% %TIME%"

:: Step 7: Push to main
echo [7/7] Pushing to GitHub (aeromint-v3)...
git branch -M main
git push -u origin main --force

echo.
echo ====================================================
echo   🎉 DONE! AeroMint V3 code synced and pushed to:
echo   https://github.com/Jainbharat666/aeromint-v3
echo ====================================================
pause
