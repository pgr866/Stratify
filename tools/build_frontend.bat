@echo off

:: BUILD FRONTEND

:: Change the current working directory to the root directory
cd /d %~dp0
cd ..

mkdir frontend\dist
:: Node.js configuration: type frontend, React, JavaScript
::npm create vite
cd frontend
npm install
npm install react-router-dom react-hot-toast axios react-hook-form react-select js-cookie
npm install -D tailwindcss postcss autoprefixer
::npx tailwindcss init -p

echo.
echo Frontend built.
echo.
pause