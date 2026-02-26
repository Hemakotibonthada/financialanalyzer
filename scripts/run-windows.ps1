# Financial Analyzer - Windows App Runner
# Run this script to build and launch the Windows application

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Financial Analyzer - Windows App" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Yellow

# Check Node.js
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Node.js not found!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Node.js: $(node --version)" -ForegroundColor Green

# Check npm
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Host "❌ npm not found!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ npm: $(npm --version)" -ForegroundColor Green

# Check MSBuild
$msbuild = Get-Command msbuild -ErrorAction SilentlyContinue
if (-not $msbuild) {
    Write-Host "❌ MSBuild not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Visual Studio 2022 with:" -ForegroundColor Yellow
    Write-Host "  - Desktop development with C++" -ForegroundColor Gray
    Write-Host "  - Universal Windows Platform development" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Or install Build Tools for Visual Studio 2022" -ForegroundColor Gray
    Write-Host "Download: https://visualstudio.microsoft.com/downloads/" -ForegroundColor Gray
    exit 1
}
Write-Host "✅ MSBuild found" -ForegroundColor Green

Write-Host ""

# Check Windows SDK
$sdkPath = "C:\Program Files (x86)\Windows Kits\10\bin"
if (Test-Path $sdkPath) {
    Write-Host "✅ Windows 10 SDK found" -ForegroundColor Green
} else {
    Write-Host "⚠️  Windows 10 SDK not detected" -ForegroundColor Yellow
    Write-Host "   Install from: https://developer.microsoft.com/en-us/windows/downloads/windows-sdk/" -ForegroundColor Gray
}

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
Write-Host "Building Windows Application" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Change to mobile directory
Set-Location mobile

# Check if windows folder exists
if (-not (Test-Path "windows")) {
    Write-Host "Initializing React Native Windows..." -ForegroundColor Yellow
    npx react-native-windows-init --overwrite
    Write-Host ""
}

# Check if node_modules exists
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
    Write-Host ""
}

Write-Host "Building and launching Windows app..." -ForegroundColor Yellow
Write-Host ""
Write-Host "⏳ This may take 5-10 minutes on first build..." -ForegroundColor Gray
Write-Host "   Please be patient..." -ForegroundColor Gray
Write-Host ""
Write-Host "What's happening:" -ForegroundColor Cyan
Write-Host "  1. Restoring NuGet packages" -ForegroundColor Gray
Write-Host "  2. Auto-linking native modules" -ForegroundColor Gray
Write-Host "  3. Compiling C++ code" -ForegroundColor Gray
Write-Host "  4. Building UWP app package" -ForegroundColor Gray
Write-Host "  5. Deploying to Windows" -ForegroundColor Gray
Write-Host "  6. Launching app" -ForegroundColor Gray
Write-Host ""

# Run the build
& npx react-native run-windows

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "✅ Windows App Launched Successfully!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "📱 The app should now be running on Windows" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Hot reload is enabled - changes will reflect automatically" -ForegroundColor Gray
    Write-Host ""
    Write-Host "To rebuild:" -ForegroundColor Yellow
    Write-Host "  npx react-native run-windows" -ForegroundColor Gray
    Write-Host ""
    Write-Host "To build release version:" -ForegroundColor Yellow
    Write-Host "  npx react-native run-windows --release" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "❌ Build Failed" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Common solutions:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. Clean build:" -ForegroundColor White
    Write-Host "   cd windows" -ForegroundColor Gray
    Write-Host "   msbuild financial-analyzer-mobile.sln /t:Clean" -ForegroundColor Gray
    Write-Host "   cd .." -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. Reinstall react-native-windows:" -ForegroundColor White
    Write-Host "   npm uninstall react-native-windows" -ForegroundColor Gray
    Write-Host "   npx react-native-windows-init --overwrite" -ForegroundColor Gray
    Write-Host ""
    Write-Host "3. Check Visual Studio installation:" -ForegroundColor White
    Write-Host "   - Desktop development with C++" -ForegroundColor Gray
    Write-Host "   - Universal Windows Platform development" -ForegroundColor Gray
    Write-Host "   - Windows 10 SDK (10.0.19041.0 or higher)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "4. Update dependencies:" -ForegroundColor White
    Write-Host "   npm install" -ForegroundColor Gray
    Write-Host ""
}

Write-Host ""
Write-Host "📚 Documentation:" -ForegroundColor Yellow
Write-Host "   BUILD_GUIDE.md - Detailed build instructions" -ForegroundColor Gray
Write-Host "   README_MOBILE.md - App overview" -ForegroundColor Gray
Write-Host ""
