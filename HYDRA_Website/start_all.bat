@echo off
REM ============================================================
REM WebHydra - Full System Startup Script
REM Starts all three servers required for the dashboard
REM ============================================================

echo.
echo ========================================
echo   WebHydra Full System Startup
echo ========================================
echo.

REM Change to the project directory
cd /d "%~dp0"

echo Starting Frontend Server (Port 3000)...
start "WebHydra Frontend" cmd /k "cd /d "%~dp0" && python -m http.server 3000"

echo Starting Threat Intelligence Backend (Port 5000)...
start "WebHydra TI Backend" cmd /k "cd /d "%~dp0backend" && python app.py"

timeout /t 2 /nobreak > nul

echo Starting Mock WAF Backend (Port 8080)...
start "WebHydra WAF Mock" cmd /k "cd /d "%~dp0backend" && python waf_mock.py"

echo.
echo ========================================
echo   All servers starting...
echo ========================================
echo.
echo   Frontend:    http://localhost:3000
echo   TI Backend:  http://localhost:5000
echo   WAF Mock:    http://localhost:8080
echo.
echo   Login at: http://localhost:3000/login.html
echo   Credentials: admin / admin123
echo.
echo   Press any key to open the dashboard...
echo ========================================

pause > nul

start http://localhost:3000/login.html
