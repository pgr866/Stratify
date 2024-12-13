@echo off

:: BUILD BACKEND

:: Admin request
net session >nul 2>&1
if %errorLevel% neq 0 ( powershell Start-Process "%0" -Verb RunAs & exit /b )

:: Change the current working directory to the root directory
cd /d %~dp0
cd ..

:: Python version
set /p version=<tools\python_version.txt
:: Python path
set _python=%userprofile%\AppData\Local\Programs\Python\Python%version:~0,1%%version:~2,2%\python.exe

:: Create Python venv
mkdir backend 2>nul
cd backend
%_python% -m venv venv
cd ..
call %cd%\backend\venv\Scripts\activate.bat

:: New Python venv path
set python=%cd%\backend\venv\Scripts\python.exe

:: Check Python venv version
%python% --version

:: Install pip
curl -o get-pip.py https://bootstrap.pypa.io/get-pip.py
%python% get-pip.py
del get-pip.py

:: Create a temporary requirements file without ta-lib
findstr /v /i "ta-lib" tools\python_requirements.txt > tools\python_requirements_no_ta_lib.txt
:: Install libraries listed in tools\python_requirements.txt, except for ta-lib
%python% -m pip install -U -r tools\python_requirements_no_ta_lib.txt
:: Clean up temporary requirements file
del tools\python_requirements_no_ta_lib.txt

:: Install TA-Lib
%python% -m pip install -U https://github.com/cgohlke/talib-build/releases/download/v0.5.1/ta_lib-0.5.1-cp312-cp312-win_amd64.whl

:: List installed libraries
%python% -m pip list

:: Configure PostgreSQL Database
set /p PG_VERSION=<tools\postgresql_version.txt
set DB_NAME=stratify_db
set DB_USER=admin
set DB_PASSWORD=1234

:: Read .env if exists
if exist .env (
    for /f "tokens=1,* delims==" %%a in ('findstr /v "^#" .env') do (
        set "%%a=%%b"
    )
)

:: Start PostgreSQL server
"C:\Program Files\PostgreSQL\%PG_VERSION:~0,2%\bin\pg_ctl.exe" stop -D "C:\Program Files\PostgreSQL\%PG_VERSION:~0,2%\data"
"C:\Program Files\PostgreSQL\%PG_VERSION:~0,2%\bin\pg_ctl.exe" start -D "C:\Program Files\PostgreSQL\%PG_VERSION:~0,2%\data" -l "C:\Program Files\PostgreSQL\%PG_VERSION:~0,2%\data\postgresql.log" -w
timeout /t 5 /nobreak > nul

:: Create a temporal SQL script
(
echo CREATE USER %DB_USER% WITH PASSWORD '%DB_PASSWORD%';
echo ALTER ROLE %DB_USER% SET client_encoding TO 'utf8';
echo ALTER ROLE %DB_USER% SET default_transaction_isolation TO 'read committed';
echo ALTER ROLE %DB_USER% SET timezone TO 'UTC';
echo ALTER ROLE %DB_USER% CREATEDB;
echo CREATE DATABASE %DB_NAME%;
echo \c %DB_NAME%
echo GRANT ALL PRIVILEGES ON DATABASE %DB_NAME% TO %DB_USER%;
echo GRANT ALL PRIVILEGES ON SCHEMA public TO %DB_USER%;
) > create_db.sql

:: Run SQL script to configure Database and Roles as postgres user
psql -U postgres -d postgres -f create_db.sql
del create_db.sql
mkdir frontend\dist

:: Uncomment to create a new Django project
::cd backend
::%python% -m django startproject backend .
::%python% manage.py startapp stratify
::cd ..
:: Make migrations
%python% backend\manage.py makemigrations
:: Migrate
%python% backend\manage.py migrate
:: Create superuser
%python% backend\manage.py createsuperuser

:: Stop PostgreSQL server
"C:\Program Files\PostgreSQL\%PG_VERSION:~0,2%\bin\pg_ctl.exe" stop -D "C:\Program Files\PostgreSQL\%PG_VERSION:~0,2%\data"

echo.
echo Backend built.
echo.
pause
