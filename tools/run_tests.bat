@echo off

:: RUN DJANGO TESTS

:: Change the current working directory to the root directory
cd /d %~dp0
cd ..

:: Python venv path
set python=%cd%\backend\venv\Scripts\python.exe

:: Run Django Tests
%python% backend\manage.py test stratify

echo.
echo Django tests run successfully
echo.
