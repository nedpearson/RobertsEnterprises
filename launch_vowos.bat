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
echo Launch sequence initiated! Closing this launcher window.
timeout /t 3 >nul
exit
