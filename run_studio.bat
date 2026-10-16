@echo off
title Kestrel - Hunt flaws. Ship armor.
echo ========================================================
echo   Starting Kestrel - AI Cybersecurity IDE
echo   Hunt flaws. Ship armor.
echo ========================================================
cd /d "%~dp0"

echo 1. Launching FastAPI Backend on http://127.0.0.1:8000 ...
start "Kestrel Backend" cmd /k "call venv\Scripts\activate.bat && python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload"

echo 2. Launching Vite Frontend on http://127.0.0.1:8080 ...
start "Kestrel Frontend" cmd /k "cd frontend && npm run dev"

timeout /t 4 /nobreak >nul
echo Both servers started!
echo Open http://127.0.0.1:8000 or http://localhost:8080 in your browser.
pause
