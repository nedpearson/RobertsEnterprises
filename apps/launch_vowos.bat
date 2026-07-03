@echo off
echo ==========================================
echo Starting VowOS - Bridal Retail Platform
echo ==========================================

echo [1/2] Launching Backend Service...
:: Adjust "backend" to your actual backend folder name and command
start "VowOS Backend" cmd /k "cd backend && npm run start:dev"

echo [2/2] Launching Frontend (Atelier Portal / Terminal)...
:: Adjust "frontend" to your actual frontend folder name and command
start "VowOS Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo Launch sequence initiated! Waiting 5 seconds for servers to boot...
timeout /t 5 >nul

echo Opening VowOS in your default browser...
start http://localhost:5173
start http://localhost:4000/api/health

exit
