# VoiceLoan Emergency HTTPS Tunneling Helper (ngrok)
# Use this script if Railway/Render deployment hits timeouts before your demo pitch.

Write-Host "==========================================================" -ForegroundColor Green
Write-Host "   VoiceLoan Emergency HTTPS Tunneling Assistant         " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Green
Write-Host ""

$BackendPort = 8001

Write-Host "[1/2] Starting local FastAPI backend on port $BackendPort..." -ForegroundColor Yellow
Start-Process -FilePath "python" -ArgumentList "-m uvicorn backend.app.main:app --host 0.0.0.0 --port $BackendPort" -WorkingDirectory "$PSScriptRoot"

Start-Sleep -Seconds 2

Write-Host "[2/2] Checking ngrok availability..." -ForegroundColor Yellow
if (Get-Command ngrok -ErrorAction SilentlyContinue) {
    Write-Host "ngrok detected! Starting HTTPS tunnel for backend port $BackendPort..." -ForegroundColor Green
    Write-Host "Copy the HTTPS URL generated below and set as VITE_API_BASE_URL on Vercel!" -ForegroundColor Cyan
    ngrok http $BackendPort
} else {
    Write-Host "ngrok is not installed globally." -ForegroundColor Red
    Write-Host "To tunnel your backend over HTTPS instantly:" -ForegroundColor Yellow
    Write-Host "  1. Download ngrok from https://ngrok.com/download" -ForegroundColor White
    Write-Host "  2. Run: ngrok http 8001" -ForegroundColor White
    Write-Host "  3. Copy the https://xxxx.ngrok-free.app URL and set VITE_API_BASE_URL in Vercel settings!" -ForegroundColor White
}
