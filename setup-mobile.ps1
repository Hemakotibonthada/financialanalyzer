# Financial Analyzer - Mobile App Initialization Script
# This script helps set up the React Native project structure

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Financial Analyzer - Mobile App Setup" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
Write-Host "Checking prerequisites..." -ForegroundColor Yellow
$nodeVersion = node --version 2>$null
if (-not $nodeVersion) {
    Write-Host "❌ Node.js is not installed!" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Node.js installed: $nodeVersion" -ForegroundColor Green

# Check if we're in the right directory
if (-not (Test-Path ".\mobile")) {
    Write-Host "❌ Please run this script from the Financial_Analyzer root directory" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Step 1: Installing React Native CLI" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
npm install -g react-native-cli

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Step 2: Checking if native folders exist" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

$androidExists = Test-Path ".\mobile\android"
$iosExists = Test-Path ".\mobile\ios"

if ($androidExists -and $iosExists) {
    Write-Host "✅ Native folders already exist!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Skipping initialization. Proceeding to install dependencies..." -ForegroundColor Yellow
} else {
    Write-Host "Native folders not found. Initializing React Native project..." -ForegroundColor Yellow
    Write-Host ""
    
    # Backup our custom files
    Write-Host "Backing up custom files..." -ForegroundColor Yellow
    $backupDir = ".\mobile_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
    
    if (Test-Path ".\mobile\src") {
        Copy-Item -Path ".\mobile\src" -Destination "$backupDir\src" -Recurse -Force
    }
    Copy-Item -Path ".\mobile\package.json" -Destination "$backupDir\package.json" -Force
    Copy-Item -Path ".\mobile\*.md" -Destination "$backupDir\" -Force
    
    Write-Host "✅ Backup created at: $backupDir" -ForegroundColor Green
    Write-Host ""
    
    # Initialize React Native project
    Write-Host "Initializing React Native project (this may take a few minutes)..." -ForegroundColor Yellow
    npx react-native@0.73.2 init FinancialAnalyzerTemp --version 0.73.2
    
    # Move native folders to mobile directory
    Write-Host "Moving native folders..." -ForegroundColor Yellow
    if (Test-Path ".\FinancialAnalyzerTemp\android") {
        Move-Item -Path ".\FinancialAnalyzerTemp\android" -Destination ".\mobile\android" -Force
    }
    if (Test-Path ".\FinancialAnalyzerTemp\ios") {
        Move-Item -Path ".\FinancialAnalyzerTemp\ios" -Destination ".\mobile\ios" -Force
    }
    
    # Clean up temp directory
    Remove-Item -Path ".\FinancialAnalyzerTemp" -Recurse -Force
    
    # Restore custom files
    Write-Host "Restoring custom files..." -ForegroundColor Yellow
    Copy-Item -Path "$backupDir\src" -Destination ".\mobile\src" -Recurse -Force
    Copy-Item -Path "$backupDir\package.json" -Destination ".\mobile\package.json" -Force
    Copy-Item -Path "$backupDir\*.md" -Destination ".\mobile\" -Force
    
    Write-Host "✅ React Native project initialized!" -ForegroundColor Green
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Step 3: Installing Dependencies" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Set-Location ".\mobile"
npm install

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  Step 4: Linking Vector Icons" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
npx react-native link react-native-vector-icons

Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  ✅ Setup Complete!" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Update API URL in src/services/api.js" -ForegroundColor White
Write-Host "2. Start the backend server: cd ..\backend && npm run dev" -ForegroundColor White
Write-Host "3. For Android: npm run android" -ForegroundColor White
Write-Host "4. For iOS (macOS only): cd ios && pod install && cd .. && npm run ios" -ForegroundColor White
Write-Host ""
Write-Host "For detailed instructions, see MOBILE_SETUP_GUIDE.md" -ForegroundColor Cyan
Write-Host ""

Set-Location ..
