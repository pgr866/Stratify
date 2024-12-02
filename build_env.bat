@echo off

:: BUILD ENVIRONMENT

echo Installing Python...
cd tools
call install_python.bat

echo Installing PostgreSQL...
call install_postgresql.bat

echo Installing Node.js...
call install_nodejs.bat

echo Building Backend...
call build_backend.bat

echo Building Frontend...
call build_frontend.bat

echo.
echo Environment setup completed.
echo.
pause
