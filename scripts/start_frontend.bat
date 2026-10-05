@echo off
setlocal
title FoodBridge Frontend App
set "ROOT_DIR=%~dp0..\"

echo ======================================================================
echo                     FoodBridge Frontend App
echo ======================================================================
echo.

if not exist "%ROOT_DIR%frontend\node_modules" (
    echo [!] Node modules not found. Running npm install...
    cd /d "%ROOT_DIR%frontend"
    call npm.cmd install
)

echo Starting Vite dev server on http://localhost:3000...
cd /d "%ROOT_DIR%frontend"
call npm.cmd run dev
pause
