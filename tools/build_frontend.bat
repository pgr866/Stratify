@echo off

:: BUILD FRONTEND

:: Change the current working directory to the root directory
cd /d %~dp0
cd ..

:: Node.js configuration
::start /WAIT cmd /c "npm create vite@latest frontend -- --template react-ts"
::copy /Y tools\package.json frontend\package.json
cd frontend
start /WAIT cmd /c "npm install"
::npm install react-router-dom react-hook-form react-hot-toast axios js-cookie @react-oauth/google react-select rsuite lightweight-charts
::npm install -D autoprefixer postcss tailwindcss
::npx tailwindcss init -p

echo.
echo Frontend built.
echo.
pause
