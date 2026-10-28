@echo off
cd /d "%~dp0"
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js 20 or newer is required.
  echo Get it free from https://nodejs.org/en/download
  pause
  exit /b 1
)
echo.
echo Starting Sports Nexus...
echo Open http://localhost:3400 in your browser.
echo Keep this window open while using the app.
echo.
start "" cmd /c "timeout /t 2 /nobreak >nul & start http://localhost:3400"
node local-server.cjs
pause
