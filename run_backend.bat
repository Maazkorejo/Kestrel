@echo off
title Kestrel AI Backend Server
echo Starting Kestrel AI Backend on http://127.0.0.1:8000 ...
call venv\Scripts\activate.bat
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000 --reload
pause
