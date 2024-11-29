@echo off

:: INSTALL POSTGRESQL

:: Change the current working directory to tools directory
cd /d %~dp0

:: Install and configure PostgreSQL Database
set /p PG_VERSION=<postgresql_version.txt
set DB_USER=admin
set DB_PASSWORD=1234

:: Install PostgreSQL
curl -L -o postgresql-%PG_VERSION%-1-windows-x64.exe https://get.enterprisedb.com/postgresql/postgresql-%PG_VERSION%-1-windows-x64.exe
powershell -Command "Start-Process postgresql-%PG_VERSION%-1-windows-x64.exe -ArgumentList '--mode unattended', '--unattendedmodeui none', '--serviceaccount %DB_USER%', '--servicename postgresql', '--servicepassword %DB_PASSWORD%', '--superpassword %DB_PASSWORD%' -Wait -Verb RunAs"
del postgresql-%PG_VERSION%-1-windows-x64.exe
setx /M Path "%Path%;C:\Program Files\PostgreSQL\%PG_VERSION:~0,2%\bin"

:: Check PostgreSQL version
psql --version

echo.
echo PostgreSQL %PG_VERSION% installed.
echo.
pause
