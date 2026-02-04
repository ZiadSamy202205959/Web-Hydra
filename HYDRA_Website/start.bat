@echo off
REM WebHydra Dashboard Startup Script for Windows
REM This script starts a local HTTP server to run the WebHydra dashboard

echo ========================================
echo   WebHydra Dashboard Startup
echo ========================================
echo.

REM Change to the script's directory
cd /d "%~dp0"

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    py --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo ERROR: Python is not installed or not in PATH
        echo.
        echo Please install Python from https://www.python.org/downloads/
        echo Make sure to check "Add Python to PATH" during installation
        echo.
        pause
        exit /b 1
    ) else (
        set PYTHON_CMD=py
    )
) else (
    set PYTHON_CMD=python
)

echo Starting HTTP server on port 3000...
echo.
echo Open your browser and navigate to: http://localhost:3000
echo.
echo Press Ctrl+C to stop the server
echo.

REM Start the HTTP server
%PYTHON_CMD% -m http.server 3000

pause

