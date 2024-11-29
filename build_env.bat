@echo off

:: BUILD ENVIRONMENT

echo Installing Python...
cd tools
call install_python.bat

echo Installing PostgreSQL...
call install_postgresql.bat

echo Building Backend...
call build_backend.bat

echo Installing Node.js...
cd tools
call install_node.bat

echo Building Frontend...
cd tools
call build_frontend.bat

echo.
echo Environment setup completed.
echo.
pause
