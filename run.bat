@echo off

:: RUN SERVERS

:: Change the current working directory to the directory where the batch script is located
cd /d %~dp0

:: PostgreSQL version
set /p PG_VERSION=<postgresql_version.txt

:: Run PostgreSQL server
"C:\Program Files\PostgreSQL\%PG_VERSION:~0,2%\bin\pg_ctl.exe" stop -D "C:\Program Files\PostgreSQL\%PG_VERSION:~0,2%\data"
"C:\Program Files\PostgreSQL\%PG_VERSION:~0,2%\bin\pg_ctl.exe" start -D "C:\Program Files\PostgreSQL\%PG_VERSION:~0,2%\data" -l "C:\Program Files\PostgreSQL\%PG_VERSION:~0,2%\data\postgresql.log" -w

:: Python venv path
set python=%cd%\venv\Scripts\python.exe

:: Run Django server
start cmd /k "%python% backend\manage.py runserver"

:: Run Node.js server
cd frontend
start cmd /k "npm run dev"
