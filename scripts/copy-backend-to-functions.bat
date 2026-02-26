@echo off
echo Copying backend files to functions directory...
echo.

REM Create directories if they don't exist
if not exist "functions\config" mkdir "functions\config"
if not exist "functions\controllers" mkdir "functions\controllers"
if not exist "functions\middleware" mkdir "functions\middleware"
if not exist "functions\models" mkdir "functions\models"
if not exist "functions\routes" mkdir "functions\routes"
if not exist "functions\services" mkdir "functions\services"
if not exist "functions\utils" mkdir "functions\utils"

REM Copy all files
echo Copying config files...
xcopy /Y "backend\config\*.js" "functions\config\" >nul 2>&1

echo Copying controllers...
xcopy /Y "backend\controllers\*.js" "functions\controllers\" >nul 2>&1

echo Copying middleware...
xcopy /Y "backend\middleware\*.js" "functions\middleware\" >nul 2>&1

echo Copying models...
xcopy /Y "backend\models\*.js" "functions\models\" >nul 2>&1

echo Copying routes...
xcopy /Y "backend\routes\*.js" "functions\routes\" >nul 2>&1

echo Copying services...
xcopy /Y "backend\services\*.js" "functions\services\" >nul 2>&1

echo Copying utils...
xcopy /Y "backend\utils\*.js" "functions\utils\" >nul 2>&1

echo.
echo ✅ All backend files copied to functions directory!
echo.
echo Next steps:
echo 1. cd functions
echo 2. npm install
echo 3. firebase deploy --only functions
echo.
pause
