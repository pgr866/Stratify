@echo off

:: INSTALL NODE.JS

:: Admin request
net session >nul 2>&1
if %errorLevel% neq 0 ( powershell Start-Process "%0" -Verb RunAs & exit /b )

:: Change the current working directory to tools directory
cd /d %~dp0

:: Node.js version
set /p version=<nodejs_version.txt

:: Download and install Node.js
curl -L -o node-v%version%-x64.msi https://nodejs.org/dist/v%version%/node-v%version%-x64.msi
msiexec /i node-v%version%-x64.msi /quiet /norestart
del node-v%version%-x64.msi
setx PATH "$env:PATH;C:\Program Files\nodejs"

:: Check Node.js version
node -v

echo.
echo Node.js %version% installed.
echo.
pause
