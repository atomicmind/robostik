@echo off
setlocal

REM Ensure we run from the script directory
cd /d %~dp0

REM Stop any process listening on port 5000
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5000" ^| findstr LISTENING') do (
  taskkill /F /PID %%a >nul 2>&1
)

REM Start Flask app using .venv
if exist ".\.venv\Scripts\python.exe" (
  .\.venv\Scripts\python.exe run.py
) else (
  echo [ERROR] .venv not found. Create it first.
  exit /b 1
)

endlocal
