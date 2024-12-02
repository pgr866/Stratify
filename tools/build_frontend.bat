@echo off

:: BUILD FRONTEND

:: Change the current working directory to the root directory
cd /d %~dp0
cd ..

:: Node.js configuration: React, JavaScript
::start /WAIT cmd /c "npm create vite@latest frontend"
::copy /Y tools\package.json frontend\package.json
cd frontend
start /WAIT cmd /c "npm install"
::npm install react-router-dom react-hot-toast axios js-cookie @react-oauth/google react-hook-form react-select rsuite lightweight-charts
::npm install -D tailwindcss postcss autoprefixer @babel/plugin-proposal-private-property-in-object
::npx tailwindcss init -p

echo.
echo Frontend built.
echo.
pause
