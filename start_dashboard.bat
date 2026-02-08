@echo off
REM ============================================
REM TAIA Dashboard Starter
REM ============================================

echo.
echo =========================================
echo TAIA Agent Dashboard Launcher
echo =========================================
echo.

REM Get the directory where this script is located
cd /d "%~dp0"

echo Starte TAIA Dashboard...
echo.

REM Set UTF-8 encoding for Python
set PYTHONIOENCODING=utf-8

REM Start Streamlit
echo Oeffne http://localhost:8501 in deinem Browser...
echo.

timeout /t 2

streamlit run src/gui/main.py

REM Keep window open if there's an error
if errorlevel 1 (
    echo.
    echo FEHLER: Dashboard konnte nicht gestartet werden.
    echo Stelle sicher, dass:
    echo - Python installiert ist
    echo - requirements.txt wurde installiert (pip install -r requirements.txt)
    echo.
    pause
)
