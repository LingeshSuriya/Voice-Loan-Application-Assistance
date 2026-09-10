#!/usr/bin/env bash
echo "========================================================"
echo "  Launching Voice-Only Loan Application Assistant (PWA)"
echo "========================================================"

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

echo "[1/2] Starting FastAPI Backend on http://127.0.0.1:8000..."
(cd "$DIR/backend" && source .venv/bin/activate && uvicorn app.main:app --port 8000 --reload) &
BACKEND_PID=$!

sleep 2

echo "[2/2] Starting Vite Frontend on http://localhost:5173..."
(cd "$DIR/frontend" && npm run dev) &
FRONTEND_PID=$!

echo "Both servers running. Press Ctrl+C to stop both."

trap "kill $BACKEND_PID $FRONTEND_PID" EXIT
wait
