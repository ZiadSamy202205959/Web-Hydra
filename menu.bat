@echo off
setlocal enabledelayedexpansion

:menu
cls
echo =============================================
echo     WebHydra - Web Application Firewall
echo =============================================
echo.
echo  1. Start All Services
echo  2. Stop All Services
echo  3. Check Service Status
echo  4. Run Demo (Test Attacks)
echo  5. Retrain ML Model
echo  6. View Logs
echo  0. Exit
echo.
echo =============================================
set /p choice="Enter your choice [0-6]: "

if "%choice%"=="1" goto start_all
if "%choice%"=="2" goto stop_all
if "%choice%"=="3" goto status
if "%choice%"=="4" goto demo
if "%choice%"=="5" goto retrain
if "%choice%"=="6" goto logs
if "%choice%"=="0" goto exit
echo Invalid option!
timeout /t 2 >nul
goto menu

:start_all
cls
echo [*] Starting services...
echo.

REM Start ML Service
echo Starting ML Service on port 9000...
cd ml_service
start "ML Service" cmd /c "python app.py"
cd ..

REM Start Proxy
echo Starting WAF Proxy on port 8080...
cd proxy
start "WAF Proxy" cmd /c "python app.py"
cd ..

REM Start Website Server
echo Starting Website Server on port 5000...
cd HYDRA_Website
start "HYDRA Website" cmd /c "node server.js"
cd ..

echo.
echo [*] Services started. Wait a few seconds for them to initialize.
echo.
pause
goto menu

:stop_all
cls
echo [*] Stopping services...
echo.

REM Kill Python processes (ML Service and Proxy)
taskkill /IM python.exe /F 2>nul
echo Stopped Python services (ML Service, Proxy)

REM Kill Node processes (Website)
taskkill /IM node.exe /F 2>nul
echo Stopped Node.js services (Website)

echo.
echo [*] All services stopped.
echo.
pause
goto menu

:status
cls
echo [*] Checking service status...
echo.

REM Check ML Service
echo Checking ML Service (port 9000)...
curl -s http://127.0.0.1:9000/health 2>nul
if %errorlevel% neq 0 (
    echo   ML Service: NOT RUNNING
) else (
    echo   ML Service: RUNNING
)
echo.

REM Check Proxy
echo Checking WAF Proxy (port 8080)...
curl -s http://127.0.0.1:8080/health 2>nul
if %errorlevel% neq 0 (
    echo   WAF Proxy: NOT RUNNING
) else (
    echo   WAF Proxy: RUNNING
)
echo.

REM Check Website
echo Checking Website Server (port 5000)...
curl -s http://127.0.0.1:5000/api/health 2>nul
if %errorlevel% neq 0 (
    echo   Website Server: NOT RUNNING
) else (
    echo   Website Server: RUNNING
)
echo.

pause
goto menu

:demo
cls
echo [*] Running demo attacks...
echo.

echo Testing benign request...
curl -X POST http://127.0.0.1:8080/test -H "Content-Type: application/json" -d "{\"test\": \"hello\"}"
echo.
echo.

echo Testing SQL Injection...
curl "http://127.0.0.1:8080/search?q=1' OR '1'='1"
echo.
echo.

echo Testing XSS...
curl "http://127.0.0.1:8080/page?name=<script>alert(1)</script>"
echo.
echo.

echo Testing Path Traversal...
curl "http://127.0.0.1:8080/../../../etc/passwd"
echo.
echo.

echo [*] Demo complete. Check the logs for results.
echo.
pause
goto menu

:retrain
cls
echo [*] Retraining is not supported on Windows.
echo     Please use WSL or Linux for model training.
echo.
pause
goto menu

:logs
cls
echo [*] Viewing recent logs...
echo.
if exist proxy\dataset\traffic.jsonl (
    type proxy\dataset\traffic.jsonl
) else (
    echo No logs found. Run some requests through the WAF first.
)
echo.
pause
goto menu

:exit
echo.
echo Exiting...
exit /b 0
