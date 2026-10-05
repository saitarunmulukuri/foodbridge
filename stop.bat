@echo off
setlocal
title FoodBridge - Stopping Services
set "ROOT_DIR=%~dp0"

echo ======================================================================
echo                 FoodBridge - Stopping Services
echo ======================================================================
echo.

echo [*] Terminating services on ports 5000 (Flask) and 3000 (Vite)...
powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT_DIR%scripts\stop_servers.ps1"

:: Close console windows titled FoodBridge Backend or FoodBridge Frontend
taskkill /F /FI "WINDOWTITLE eq FoodBridge Backend*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq FoodBridge Frontend*" >nul 2>&1

echo.
echo ======================================================================
echo                 All Services Stopped Successfully!
echo ======================================================================
echo.
echo Press any key to exit (or close this window)...
pause >nul
