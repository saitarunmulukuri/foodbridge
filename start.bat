@echo off
setlocal enabledelayedexpansion

title FoodBridge Launcher
set "ROOT_DIR=%~dp0"

echo ======================================================================
echo                 FoodBridge - Intelligent Redistribution
echo ======================================================================
echo.

:: 1. Detect Python Environment
set "PYTHON_EXE=%ROOT_DIR%.venv\Scripts\python.exe"
if not exist "%PYTHON_EXE%" (
    where python >nul 2>&1
    if %ERRORLEVEL% equ 0 (
        set "PYTHON_EXE=python"
        echo [*] Using system python.
    ) else (
        echo [ERROR] Python not found in .venv or system PATH.
        echo Please ensure Python is installed and the virtual environment is set up.
        echo.
        pause
        exit /b 1
    )
) else (
    echo [+] Python virtual environment detected: .venv
)

:: 2. Check Frontend Dependencies
if not exist "%ROOT_DIR%frontend\node_modules" (
    echo [!] Frontend dependencies not found. Installing packages...
    pushd "%ROOT_DIR%frontend"
    call npm.cmd install
    popd
)

:: 3. Stop any existing instances on ports 5000 or 3000
echo [*] Checking existing ports (5000, 3000)...
powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT_DIR%scripts\stop_servers.ps1" >nul 2>&1

:: 4. Start Backend Service
echo [+] Starting Backend API on http://localhost:5000...
start "FoodBridge Backend" /D "%ROOT_DIR%" cmd.exe /k ""%PYTHON_EXE%" backend\app.py"

:: 5. Start Frontend Service
echo [+] Starting Frontend App on http://localhost:3000...
start "FoodBridge Frontend" /D "%ROOT_DIR%frontend" cmd.exe /k "npm.cmd run dev"

:: 6. Wait for servers to initialize
echo [*] Waiting for services to initialize...
ping 127.0.0.1 -n 4 >nul

:: 7. Launch browser
echo [+] Opening web app in your browser...
start http://localhost:3000

echo.
echo ======================================================================
echo                    FoodBridge is Now Running!
echo ======================================================================
echo   Frontend Web App:  http://localhost:3000
echo   Backend API:       http://localhost:5000/api/v1
echo   Health Status:     http://localhost:5000/api/v1/health
echo.
echo   Demo Login Accounts (Password for all: Secure@12345):
echo     - Food Donor:       e2e_donor@foodbridge.org
echo     - NGO Partner:      e2e_ngo@foodbridge.org
echo     - Volunteer Driver: e2e_vol@foodbridge.org
echo.
echo   To stop all running servers, double-click or run:
echo     stop.bat
echo ======================================================================
echo.
echo Press any key to close this launcher window (servers will stay running)...
pause >nul
