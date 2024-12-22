@echo off

:: BUILD FRONTEND

:: Change the current working directory to the root directory
cd /d %~dp0
cd ..

:: Uncomment all to create a new Vite.js project
::rmdir /s /q "frontend"
::start /WAIT cmd /c "npm create vite@latest frontend -- --template react-ts"
:: Node.js configuration
cd frontend
start /WAIT cmd /c "npm i & pause"
::npm i react-router-dom react-hook-form axios js-cookie @react-oauth/google lightweight-charts lucide-react
::npm i -D autoprefixer postcss tailwindcss
::npx tailwindcss init -p
:: Update package.json versions
::npx npm-check-updates
::npx npm-check-updates -u
::npm i

:: Configure shadcnui for vite: follow https://ui.shadcn.com/docs/
::npx shadcn@latest init
::npx shadcn@latest add button calendar card dialog input label popover scroll-area toast

echo.
echo Frontend built.
echo.
pause
