@echo off
setlocal enabledelayedexpansion

echo.
echo ================================================================
echo   DEPLOYING COMPLETE BACKEND TO FIREBASE FUNCTIONS
echo ================================================================
echo.

cd /d "%~dp0"

REM Create functions directories if they don't exist
echo Creating directory structure...
if not exist "functions\config" mkdir "functions\config"
if not exist "functions\controllers" mkdir "functions\controllers"
if not exist "functions\middleware" mkdir "functions\middleware"
if not exist "functions\models" mkdir "functions\models"
if not exist "functions\routes" mkdir "functions\routes"
if not exist "functions\services" mkdir "functions\services"
if not exist "functions\utils" mkdir "functions\utils"
echo [OK] Directories created
echo.

REM Copy all backend files
echo Copying backend files to functions...
echo.

echo [1/7] Copying config files...
xcopy /Y /Q "backend\config\*.js" "functions\config\" 2>nul
if errorlevel 1 (echo   - config: No files found) else (echo   - config: OK)

echo [2/7] Copying controllers...
xcopy /Y /Q "backend\controllers\*.js" "functions\controllers\" 2>nul
if errorlevel 1 (echo   - controllers: No files found) else (echo   - controllers: OK)

echo [3/7] Copying middleware...
xcopy /Y /Q "backend\middleware\*.js" "functions\middleware\" 2>nul
if errorlevel 1 (echo   - middleware: No files found) else (echo   - middleware: OK)

echo [4/7] Copying models...
xcopy /Y /Q "backend\models\*.js" "functions\models\" 2>nul
if errorlevel 1 (echo   - models: No files found) else (echo   - models: OK)

echo [5/7] Copying routes...
xcopy /Y /Q "backend\routes\*.js" "functions\routes\" 2>nul
if errorlevel 1 (echo   - routes: No files found) else (echo   - routes: OK)

echo [6/7] Copying services...
xcopy /Y /Q "backend\services\*.js" "functions\services\" 2>nul
if errorlevel 1 (echo   - services: No files found) else (echo   - services: OK)

echo [7/7] Copying utils...
xcopy /Y /Q "backend\utils\*.js" "functions\utils\" 2>nul
if errorlevel 1 (echo   - utils: No files found) else (echo   - utils: OK)

echo.
echo ================================================================
echo   FILES COPIED SUCCESSFULLY!
echo ================================================================
echo.

REM Count files
set total=0
for /r "functions" %%f in (*.js) do set /a total+=1
echo Total JavaScript files in functions: !total!
echo.

echo Installing dependencies...
cd functions
call npm install
if errorlevel 1 (
    echo.
    echo [WARNING] npm install had issues. You may need to run it manually.
    echo.
) else (
    echo [OK] Dependencies installed successfully!
    echo.
)

cd ..

echo.
echo ================================================================
echo   DEPLOYMENT PREPARATION COMPLETE!
echo ================================================================
echo.
echo NEXT STEPS:
echo.
echo 1. Configure MongoDB Atlas:
echo    firebase functions:config:set mongodb.uri="your_mongodb_atlas_uri"
echo.
echo 2. Configure JWT Secrets:
echo    firebase functions:config:set jwt.secret="your_secret_min_32_chars"
echo    firebase functions:config:set jwt.refresh_secret="your_refresh_secret"
echo.
echo 3. Deploy to Firebase:
echo    firebase deploy --only functions
echo.
echo 4. Test deployment:
echo    curl https://asia-south1-finserveassist.cloudfunctions.net/api/health
echo.
echo For detailed instructions, see: DEPLOY_NOW.md
echo.
pause
