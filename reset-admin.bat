@echo off
echo ========================================
echo ConvoAI Global Admin Reset Script
echo ========================================
echo.

echo Stopping any running ConvoAI processes...
taskkill /f /im node.exe /fi "WINDOWTITLE eq ConvoAI*" >nul 2>&1

echo.
echo Running complete admin reset...
node reset-global-admin.js

echo.
echo ========================================
echo Reset completed!
echo ========================================
echo.
echo Login at: http://localhost:3000/admin-login
echo Email: global@convoai.com
echo Password: ConvoAI2025!
echo.
pause