@echo off
:: start-app.bat - Lanzador automático para Windows
echo ==========================================================
echo    Che, levantando el servidor de desarrollo de UdeMM...
echo ==========================================================
start cmd /k "npm run dev"
timeout /t 3 /nobreak > NUL
start http://localhost:5173
