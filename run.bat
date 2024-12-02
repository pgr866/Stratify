@echo off

:: RUN SERVERS

:: Change the current working directory to the root directory
cd /d %~dp0

:: PostgreSQL version
set /p PG_VERSION=<tools\postgresql_version.txt

:: Python venv path
set python=%cd%\backend\venv\Scripts\python.exe

:: Run PostgreSQL and Django servers
start cmd /k ""C:\Program Files\PostgreSQL\%PG_VERSION:~0,2%\bin\pg_ctl.exe" stop -D "C:\Program Files\PostgreSQL\%PG_VERSION:~0,2%\data" & cls & "C:\Program Files\PostgreSQL\%PG_VERSION:~0,2%\bin\pg_ctl.exe" start -D "C:\Program Files\PostgreSQL\%PG_VERSION:~0,2%\data" -l "C:\Program Files\PostgreSQL\%PG_VERSION:~0,2%\data\postgresql.log" & start cmd /k "%python% backend\manage.py runserver""

:: Run Node.js server
cd frontend
start cmd /k "npm run dev"
