@echo off
echo Starting Railway AI Planner API on port 8000...
cd "%~dp0planner-api"
if exist ".venv\Scripts\uvicorn.exe" (
    ".venv\Scripts\uvicorn.exe" main:app --host 0.0.0.0 --port 8000 --reload
) else (
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload
)
pause
