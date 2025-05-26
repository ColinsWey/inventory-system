@echo off
REM Script to configure server IP for the application

if "%1"=="" (
    echo Usage: setup-server.bat SERVER_IP
    echo Example: setup-server.bat 192.168.1.100
    exit /b 1
)

set SERVER_IP=%1
echo Setting up server IP: %SERVER_IP%

REM Update frontend .env
echo # API Configuration > frontend\.env
echo REACT_APP_API_URL=http://%SERVER_IP%:8000/api/v1 >> frontend\.env

REM Update root .env for Docker
echo # Server Configuration > .env
echo SERVER_HOST=%SERVER_IP% >> .env

echo.
echo ✅ Server IP configured successfully!
echo Frontend will use: http://%SERVER_IP%:8000/api/v1
echo.
echo Next steps:
echo 1. Build frontend: cd frontend ^&^& npm run build
echo 2. Start with Docker: docker compose up -d 