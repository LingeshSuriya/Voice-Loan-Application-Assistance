@echo off
echo ========================================================
echo   Launching Voice-Only Loan Application Assistant (PWA)
echo ========================================================

echo [1/2] Starting FastAPI Backend on http://127.0.0.1:8000...
start "Voice Loan Backend" cmd /k "cd /d %~dp0backend && .venv\Scripts\activate && uvicorn app.main:app --port 8000 --reload"

timeout /t 2 /nobreak >nul

echo [2/2] Starting Vite Frontend on http://localhost:5173...
start "Voice Loan Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo Both servers started!
echo Open your browser at http://localhost:5173
echo ========================================================
pause
