@echo off
setlocal
title FoodBridge Backend API
set "ROOT_DIR=%~dp0..\"

echo ======================================================================
echo                   FoodBridge Flask Backend API
echo ======================================================================
echo.

set "PYTHON_EXE=%ROOT_DIR%.venv\Scripts\python.exe"
if not exist "%PYTHON_EXE%" (
    where python >nul 2>&1
    if %ERRORLEVEL% equ 0 (
        set "PYTHON_EXE=python"
    ) else (
        echo [ERROR] Python not found in .venv or system PATH.
        pause
        exit /b 1
    )
)

echo Starting backend server on http://localhost:5000...
cd /d "%ROOT_DIR%"
"%PYTHON_EXE%" backend\app.py
pause
