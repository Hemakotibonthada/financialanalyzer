@echo off
echo.
echo ====================================================================
echo  Complete Backend to Firebase Functions Deployment
echo ====================================================================
echo.
echo This script will copy all backend files to functions directory
echo and prepare your application for Firebase deployment.
echo.
echo Press any key to start, or Ctrl+C to cancel...
pause >nul

cd /d "%~dp0"
echo.
echo Running deployment script...
echo.

node deploy-and-configure.js

echo.
echo ====================================================================
echo  Deployment Preparation Complete!
echo ====================================================================
echo.
echo Next Steps:
echo   1. Configure MongoDB: firebase functions:config:set mongodb.uri="your_connection"
echo   2. Configure JWT: firebase functions:config:set jwt.secret="your_secret"
echo   3. Deploy: firebase deploy --only functions
echo.
echo For detailed instructions, see: DEPLOY_NOW.md
echo.
pause
