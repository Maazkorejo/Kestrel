@echo off
echo ========================================================
echo   Starting Kestrel - AI Cybersecurity IDE
echo   Hunt flaws. Ship armor.
echo ========================================================
cd /d "%~dp0"

REM Check if node is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is not found in PATH. Please install Node.js.
    pause
    exit /b 1
)

REM Run Electron wrapper
echo Launching Kestrel desktop window...
npm start
