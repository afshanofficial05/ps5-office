@echo off
echo Starting PSO Gaming Platform - FastAPI Backend on port 8000...
cd /d "%~dp0backend"
venv\Scripts\python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
