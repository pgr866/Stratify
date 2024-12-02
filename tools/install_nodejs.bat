@echo off

:: INSTALL NODE.JS

:: Change the current working directory to tools directory
cd /d %~dp0

:: Node.js version
set /p version=<nodejs_version.txt

:: Download and install Node.js
curl -L -o node-v%version%-x64.msi https://nodejs.org/dist/v%version%/node-v%version%-x64.msi
msiexec /i node-v%version%-x64.msi /quiet /norestart
del node-v%version%-x64.msi

:: Check Node.js version
node -v

echo.
echo Node.js %version% installed.
echo.
pause
