# Financial Analyzer Mobile - Android Runner
# This script will properly start the Android app

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Financial Analyzer - Android App" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if adb is available
$adbPath = Get-Command adb -ErrorAction SilentlyContinue
if (-not $adbPath) {
    Write-Host "❌ ADB not found. Please install Android SDK Platform Tools" -ForegroundColor Red
    Write-Host "   Download from: https://developer.android.com/studio/releases/platform-tools" -ForegroundColor Gray
    exit 1
}

Write-Host "✅ ADB found" -ForegroundColor Green

# Check for devices
Write-Host ""
Write-Host "Checking for Android devices/emulators..." -ForegroundColor Yellow
$devices = adb devices
Write-Host $devices -ForegroundColor Gray
Write-Host ""

# Parse device list
$deviceLines = $devices -split "`n" | Where-Object { $_ -match "device$" -and $_ -notmatch "List of devices" }

if ($deviceLines.Count -eq 0) {
    Write-Host "❌ No Android devices or emulators found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please do ONE of the following:" -ForegroundColor Yellow
    Write-Host "  1. Start Android Studio Emulator:" -ForegroundColor White
    Write-Host "     - Open Android Studio" -ForegroundColor Gray
    Write-Host "     - Tools -> Device Manager" -ForegroundColor Gray
    Write-Host "     - Click Play button on any emulator" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  2. Connect a physical Android device:" -ForegroundColor White
    Write-Host "     - Enable Developer Options on your phone" -ForegroundColor Gray
    Write-Host "     - Enable USB Debugging" -ForegroundColor Gray
    Write-Host "     - Connect via USB cable" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

Write-Host "✅ Found $($deviceLines.Count) device(s)" -ForegroundColor Green
Write-Host ""

# Check if backend is running
Write-Host "Checking backend connection..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5001/api/auth/health" -Method GET -TimeoutSec 3 -ErrorAction SilentlyContinue
    Write-Host "✅ Backend is running on port 5001" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Backend not detected on port 5001" -ForegroundColor Yellow
    Write-Host "   Make sure to start backend: cd backend && npm start" -ForegroundColor Gray
    Write-Host ""
    $continue = Read-Host "Continue anyway? (y/n)"
    if ($continue -ne "y") {
        exit 0
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Building and Installing Android App" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Change to mobile directory
Set-Location mobile

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
    Write-Host ""
}

# Build and run
Write-Host "Building and installing app on device..." -ForegroundColor Yellow
Write-Host "This may take a few minutes on first run..." -ForegroundColor Gray
Write-Host ""

# Run the actual command
& npx react-native run-android --no-packager

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "✅ App installed successfully!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "📱 The app should now be running on your device/emulator" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Metro Bundler is running in another terminal window." -ForegroundColor Gray
    Write-Host "Keep it running while using the app." -ForegroundColor Gray
    Write-Host ""
    Write-Host "To reload the app:" -ForegroundColor Yellow
    Write-Host "  - Press 'R' twice on Android device" -ForegroundColor Gray
    Write-Host "  - Or shake the device and tap 'Reload'" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "❌ Build failed" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Common solutions:" -ForegroundColor Yellow
    Write-Host "  1. Clean build:" -ForegroundColor White
    Write-Host "     cd android && ./gradlew clean && cd .." -ForegroundColor Gray
    Write-Host ""
    Write-Host "  2. Reset cache:" -ForegroundColor White
    Write-Host "     npx react-native start --reset-cache" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  3. Reinstall dependencies:" -ForegroundColor White
    Write-Host "     rm -rf node_modules && npm install" -ForegroundColor Gray
    Write-Host ""
}
