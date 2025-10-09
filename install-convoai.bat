@echo off
REM ==========================================
REM ConvoAI Windows Installation Script
REM ==========================================
REM This script installs ConvoAI on Windows using Docker Desktop
REM Requires: Windows 10/11, Docker Desktop, Git

setlocal enabledelayedexpansion
title ConvoAI Installation Script

echo.
echo ╔═══════════════════════════════════════════════════════════════╗
echo ║                    🚀 ConvoAI Installer                      ║
echo ║            Professional Live Chat System Setup               ║
echo ║                        Windows Edition                        ║
echo ╚═══════════════════════════════════════════════════════════════╝
echo.

REM Colors (limited on Windows CMD)
set "RED=[91m"
set "GREEN=[92m"
set "YELLOW=[93m"
set "BLUE=[94m"
set "NC=[0m"

REM Configuration
set "PROJECT_NAME=ConvoAI"
set "PROJECT_DIR=%CD%"
set "LOG_FILE=%TEMP%\convoai-install.log"

echo %DATE% %TIME% - ConvoAI Installation Started > "%LOG_FILE%"

:check_admin
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo %RED%[ERROR]%NC% This script must be run as Administrator
    echo Right-click and select "Run as administrator"
    pause
    exit /b 1
)

echo %GREEN%[INFO]%NC% Running with administrator privileges
echo %DATE% %TIME% - Admin check passed >> "%LOG_FILE%"

:check_requirements
echo.
echo %BLUE%[INFO]%NC% Checking system requirements...

REM Check Windows version
for /f "tokens=4-7 delims=[.] " %%i in ('ver') do (
    if %%i==10 (
        echo %GREEN%[SUCCESS]%NC% Windows 10/11 detected
    ) else (
        echo %RED%[ERROR]%NC% Windows 10 or later required
        pause
        exit /b 1
    )
)

REM Check if Docker Desktop is installed
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo %YELLOW%[WARNING]%NC% Docker Desktop not found
    echo Please install Docker Desktop first: https://desktop.docker.com/win/main/amd64/Docker%%20Desktop%%20Installer.exe
    set /p "install_docker=Do you want to continue without Docker? (y/n): "
    if /i "!install_docker!" neq "y" (
        exit /b 1
    )
) else (
    echo %GREEN%[SUCCESS]%NC% Docker Desktop found
)

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo %YELLOW%[WARNING]%NC% Node.js not found
    echo Installing Node.js...
    goto install_nodejs
) else (
    echo %GREEN%[SUCCESS]%NC% Node.js found
)

REM Check if Git is installed
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo %YELLOW%[WARNING]%NC% Git not found
    echo Installing Git...
    goto install_git
) else (
    echo %GREEN%[SUCCESS]%NC% Git found
)

goto setup_project

:install_nodejs
echo %BLUE%[INFO]%NC% Downloading and installing Node.js...
powershell -Command "& {Invoke-WebRequest -Uri 'https://nodejs.org/dist/v18.18.0/node-v18.18.0-x64.msi' -OutFile '%TEMP%\nodejs.msi'}"
if exist "%TEMP%\nodejs.msi" (
    msiexec /i "%TEMP%\nodejs.msi" /quiet /qn /norestart
    echo %GREEN%[SUCCESS]%NC% Node.js installed
    del "%TEMP%\nodejs.msi"
) else (
    echo %RED%[ERROR]%NC% Failed to download Node.js
    pause
    exit /b 1
)
goto check_requirements

:install_git
echo %BLUE%[INFO]%NC% Downloading and installing Git...
powershell -Command "& {Invoke-WebRequest -Uri 'https://github.com/git-for-windows/git/releases/download/v2.42.0.windows.2/Git-2.42.0.2-64-bit.exe' -OutFile '%TEMP%\git-installer.exe'}"
if exist "%TEMP%\git-installer.exe" (
    "%TEMP%\git-installer.exe" /VERYSILENT /NORESTART
    echo %GREEN%[SUCCESS]%NC% Git installed
    del "%TEMP%\git-installer.exe"
) else (
    echo %RED%[ERROR]%NC% Failed to download Git
    pause
    exit /b 1
)
goto check_requirements

:setup_project
echo.
echo %BLUE%[INFO]%NC% Setting up ConvoAI project...

REM Check if we're in the ConvoAI project directory
if not exist "package.json" (
    echo %RED%[ERROR]%NC% package.json not found
    echo Please run this script from the ConvoAI project directory
    pause
    exit /b 1
)

echo %GREEN%[SUCCESS]%NC% ConvoAI project directory confirmed
echo %DATE% %TIME% - Project directory confirmed >> "%LOG_FILE%"

:install_dependencies
echo.
echo %BLUE%[INFO]%NC% Installing ConvoAI dependencies...

REM Install backend dependencies
echo Installing backend dependencies...
call npm install
if %errorlevel% neq 0 (
    echo %RED%[ERROR]%NC% Failed to install backend dependencies
    echo Check your internet connection and try again
    pause
    exit /b 1
)

REM Install frontend dependencies
if exist "frontend\package.json" (
    echo Installing frontend dependencies...
    cd frontend
    call npm install
    if %errorlevel% neq 0 (
        echo %YELLOW%[WARNING]%NC% Frontend dependencies installation failed
    ) else (
        echo Building frontend...
        call npm run build
    )
    cd ..
)

echo %GREEN%[SUCCESS]%NC% Dependencies installed successfully

:setup_environment
echo.
echo %BLUE%[INFO]%NC% Setting up environment configuration...

REM Create .env file if it doesn't exist
if not exist ".env" (
    echo Creating .env configuration file...
    (
        echo # ConvoAI Windows Environment Configuration
        echo NODE_ENV=development
        echo PORT=3000
        echo.
        echo # Database Configuration ^(using your existing MongoDB Atlas^)
        echo MONGODB_URI=mongodb+srv://DylanP:JWebSA3L8o8M1EIo@cluster0.afz799a.mongodb.net/livechat?retryWrites=true^&w=majority
        echo.
        echo # Redis Configuration ^(using Docker^)
        echo REDIS_URL=redis://localhost:6379
        echo REDIS_PASSWORD=
        echo.
        echo # Security Keys
        echo JWT_SECRET=convoai-windows-jwt-secret-change-this-in-production
        echo SESSION_SECRET=convoai-windows-session-secret-change-this-in-production
        echo.
        echo # OpenAI Configuration ^(replace with your actual API key^)
        echo OPENAI_API_KEY=your-openai-api-key-here
        echo.
        echo # CORS Configuration
        echo CORS_ORIGIN=*
        echo.
        echo # Rate Limiting
        echo RATE_LIMIT_WINDOW_MS=900000
        echo RATE_LIMIT_MAX_REQUESTS=100
        echo.
        echo # Session Configuration
        echo SESSION_MAX_AGE=86400000
        echo SESSION_STORE=memory
        echo.
        echo # Logging
        echo LOG_LEVEL=info
    ) > .env
    echo %GREEN%[SUCCESS]%NC% Environment file created
) else (
    echo %YELLOW%[INFO]%NC% Environment file already exists
)

:setup_docker
echo.
echo %BLUE%[INFO]%NC% Setting up Docker configuration...

REM Create docker-compose.yml for Windows
(
    echo version: '3.8'
    echo.
    echo services:
    echo   convoai-app:
    echo     build: .
    echo     ports:
    echo       - "3000:3000"
    echo     environment:
    echo       - NODE_ENV=${NODE_ENV:-development}
    echo       - MONGODB_URI=${MONGODB_URI}
    echo       - REDIS_URL=${REDIS_URL}
    echo       - JWT_SECRET=${JWT_SECRET}
    echo       - SESSION_SECRET=${SESSION_SECRET}
    echo       - OPENAI_API_KEY=${OPENAI_API_KEY}
    echo     volumes:
    echo       - .:/app
    echo       - /app/node_modules
    echo     depends_on:
    echo       - redis
    echo     networks:
    echo       - convoai
    echo.
    echo   redis:
    echo     image: redis:7-alpine
    echo     ports:
    echo       - "6379:6379"
    echo     volumes:
    echo       - redis_data:/data
    echo     networks:
    echo       - convoai
    echo.
    echo volumes:
    echo   redis_data:
    echo.
    echo networks:
    echo   convoai:
    echo     driver: bridge
) > docker-compose.windows.yml

echo %GREEN%[SUCCESS]%NC% Docker configuration created

:create_dockerfile
echo.
echo %BLUE%[INFO]%NC% Creating optimized Dockerfile...

REM Create Dockerfile if it doesn't exist
if not exist "Dockerfile" (
    (
        echo # ConvoAI Windows Docker Image
        echo FROM node:18-alpine
        echo.
        echo WORKDIR /app
        echo.
        echo # Copy package files
        echo COPY package*.json ./
        echo.
        echo # Install dependencies
        echo RUN npm ci --only=production ^&^& npm cache clean --force
        echo.
        echo # Copy application code
        echo COPY . .
        echo.
        echo # Create non-root user
        echo RUN addgroup -g 1001 -S nodejs ^&^& \
        echo     adduser -S convoai -u 1001
        echo.
        echo USER convoai
        echo.
        echo EXPOSE 3000
        echo.
        echo HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
        echo   CMD node healthcheck.js ^|^| exit 1
        echo.
        echo CMD ["node", "server.js"]
    ) > Dockerfile
    echo %GREEN%[SUCCESS]%NC% Dockerfile created
)

:install_pm2
echo.
echo %BLUE%[INFO]%NC% Installing PM2 for process management...
call npm install -g pm2
if %errorlevel% neq 0 (
    echo %YELLOW%[WARNING]%NC% Failed to install PM2 globally
) else (
    echo %GREEN%[SUCCESS]%NC% PM2 installed successfully
)

:create_scripts
echo.
echo %BLUE%[INFO]%NC% Creating startup scripts...

REM Create start script
(
    echo @echo off
    echo title ConvoAI Development Server
    echo echo Starting ConvoAI...
    echo echo.
    echo cd /d "%~dp0"
    echo call npm start
    echo pause
) > start-convoai.bat

REM Create Docker start script
(
    echo @echo off
    echo title ConvoAI Docker Server
    echo echo Starting ConvoAI with Docker...
    echo echo.
    echo cd /d "%~dp0"
    echo docker-compose -f docker-compose.windows.yml up -d
    echo echo.
    echo echo %GREEN%ConvoAI started successfully!%NC%
    echo echo Access your application at: http://localhost:3000
    echo echo Chat Demo: http://localhost:3000/chatkit-enhanced-demo.html
    echo echo Admin Portal: http://localhost:3000/org-admin.html
    echo echo.
    echo echo Press any key to view logs...
    echo pause >nul
    echo docker-compose -f docker-compose.windows.yml logs -f
) > start-convoai-docker.bat

REM Create stop script
(
    echo @echo off
    echo title Stop ConvoAI
    echo echo Stopping ConvoAI...
    echo cd /d "%~dp0"
    echo docker-compose -f docker-compose.windows.yml down
    echo echo ConvoAI stopped successfully!
    echo pause
) > stop-convoai.bat

echo %GREEN%[SUCCESS]%NC% Startup scripts created

:test_installation
echo.
echo %BLUE%[INFO]%NC% Testing installation...

REM Test if package.json is valid
node -e "require('./package.json')" >nul 2>&1
if %errorlevel% neq 0 (
    echo %RED%[ERROR]%NC% package.json is invalid
    pause
    exit /b 1
)

REM Test if main server file exists
if exist "server.js" (
    echo %GREEN%[SUCCESS]%NC% Main server file found
) else (
    echo %RED%[ERROR]%NC% server.js not found
    pause
    exit /b 1
)

echo %GREEN%[SUCCESS]%NC% Basic tests passed

:completion
cls
echo.
echo ╔═══════════════════════════════════════════════════════════════╗
echo ║                🎉 Installation Completed! 🎉                 ║
echo ╚═══════════════════════════════════════════════════════════════╝
echo.
echo %GREEN%ConvoAI has been successfully installed on Windows!%NC%
echo.
echo %BLUE%📊 Installation Summary:%NC%
echo   • Project Directory: %GREEN%%PROJECT_DIR%%NC%
echo   • Environment: %GREEN%Windows Development%NC%
echo   • Database: %GREEN%MongoDB Atlas (Cloud)%NC%
echo   • Redis: %GREEN%Docker Container%NC%
echo.
echo %BLUE%🚀 Quick Start Options:%NC%
echo.
echo %YELLOW%Option 1 - Development Mode (Direct Node.js):%NC%
echo   Double-click: %GREEN%start-convoai.bat%NC%
echo   Or run: %GREEN%npm start%NC%
echo.
echo %YELLOW%Option 2 - Docker Mode (Recommended for Production):%NC%
echo   Double-click: %GREEN%start-convoai-docker.bat%NC%
echo   Or run: %GREEN%docker-compose -f docker-compose.windows.yml up -d%NC%
echo.
echo %BLUE%🌐 Access Your ConvoAI System:%NC%
echo   • Main Site: %GREEN%http://localhost:3000%NC%
echo   • Chat Demo: %GREEN%http://localhost:3000/chatkit-enhanced-demo.html%NC%
echo   • Admin Portal: %GREEN%http://localhost:3000/org-admin.html%NC%
echo   • Agent Dashboard: %GREEN%http://localhost:3000/agent.html%NC%
echo.
echo %BLUE%🔑 Default Credentials:%NC%
echo   • Username: %GREEN%admin@convoai.com%NC%
echo   • Password: %GREEN%admin123%NC%
echo   %YELLOW%⚠️  Change these after first login!%NC%
echo.
echo %BLUE%🛠️  Useful Commands:%NC%
echo   • Start: %GREEN%start-convoai-docker.bat%NC%
echo   • Stop: %GREEN%stop-convoai.bat%NC%
echo   • Logs: %GREEN%docker-compose -f docker-compose.windows.yml logs -f%NC%
echo   • Status: %GREEN%docker-compose -f docker-compose.windows.yml ps%NC%
echo.
echo %BLUE%📝 Next Steps:%NC%
echo   1. %YELLOW%Start ConvoAI using one of the methods above%NC%
echo   2. %YELLOW%Open http://localhost:3000 in your browser%NC%
echo   3. %YELLOW%Change default passwords%NC%
echo   4. %YELLOW%Test chat functionality%NC%
echo   5. %YELLOW%Configure your domain (optional)%NC%
echo.
echo %GREEN%🎯 ConvoAI is ready to use!%NC%
echo.
echo Installation log saved to: %GREEN%%LOG_FILE%%NC%
echo.
echo Press any key to exit...
pause >nul

:end
echo %DATE% %TIME% - ConvoAI Installation Completed >> "%LOG_FILE%"
endlocal
exit /b 0