@echo off

:: BUILD FRONTEND

:: Change the current working directory to the root directory
cd /d %~dp0
cd ..

:: Uncomment all to create a new Vite.js project
::rmdir /s /q "frontend"
::start /WAIT cmd /c "npm create vite@latest frontend -- --template react-ts"
::copy /Y tools\package.json frontend\package.json
:: Node.js configuration
cd frontend
start /WAIT cmd /c "npm install & pause"
::npm install react-router-dom react-hook-form react-hot-toast axios js-cookie @react-oauth/google react-select rsuite lightweight-charts
::npm install -D autoprefixer postcss tailwindcss
::npx tailwindcss init -p

:: Configure shadcnui: follow https://ui.shadcn.com/docs/
::npx shadcn@latest init
::npx shadcn@latest add button dropdown-menu

echo.
echo Frontend built.
echo.
pause
