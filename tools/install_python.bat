@echo off

:: INSTALL PYTHON

:: Change the current working directory to tools directory
cd /d %~dp0

:: Python version
set /p version=<python_version.txt
:: Python folder path
set python_folder=%userprofile%\AppData\Local\Programs\Python\Python%version:~0,1%%version:~2,2%\
:: Python path
set python=%python_folder%\python.exe

:: Download and install Python
curl -L -o python-%version%-amd64.exe https://www.python.org/ftp/python/%version%/python-%version%-amd64.exe
powershell -Command "Start-Process 'python-%version%-amd64.exe' -ArgumentList '/quiet', 'InstallAllUsers=1', 'PrependPath=1', 'TargetDir=%python_folder%' -Wait -Verb RunAs"
del python-%version%-amd64.exe

:: Check Python version
%python% --version

echo.
echo Python %version% installed.
echo.
pause
