# Financial Analyzer Mobile - Start Script
# Run this in PowerShell

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Financial Analyzer Mobile App Starter" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Function to check if a command exists
function Test-Command {
    param($Command)
    $null -ne (Get-Command $Command -ErrorAction SilentlyContinue)
}

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Yellow

if (-not (Test-Command node)) {
    Write-Host "❌ Node.js not found! Please install Node.js 18+" -ForegroundColor Red
    exit 1
}

if (-not (Test-Command npm)) {
    Write-Host "❌ npm not found! Please install npm 9+" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Node.js found: $(node --version)" -ForegroundColor Green
Write-Host "✅ npm found: $(npm --version)" -ForegroundColor Green
Write-Host ""

# Get computer's IP address
$ipAddress = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias "Ethernet*","Wi-Fi*" | Where-Object {$_.IPAddress -notlike "169.254.*"} | Select-Object -First 1).IPAddress

if ($ipAddress) {
    Write-Host "📡 Your computer's IP address: $ipAddress" -ForegroundColor Cyan
    Write-Host "   Use this IP in mobile app for physical devices" -ForegroundColor Gray
    Write-Host ""
}

# Platform selection
Write-Host "Select platform to run:" -ForegroundColor Yellow
Write-Host "1. Android" -ForegroundColor White
Write-Host "2. iOS (macOS only)" -ForegroundColor White
Write-Host "3. Windows" -ForegroundColor White
Write-Host "4. Install dependencies only" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Enter your choice (1-4)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host "Starting Android App" -ForegroundColor Cyan
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "⚠️  Make sure:" -ForegroundColor Yellow
        Write-Host "   1. Backend is running on port 5001" -ForegroundColor Gray
        Write-Host "   2. Android emulator is running OR device is connected" -ForegroundColor Gray
        Write-Host "   3. API_BASE_URL is configured in src/services/api.js" -ForegroundColor Gray
        Write-Host ""
        
        # Check if backend is running
        try {
            $response = Invoke-WebRequest -Uri "http://localhost:5001/api/auth/health" -TimeoutSec 2 -UseBasicParsing -ErrorAction SilentlyContinue
            Write-Host "✅ Backend is running!" -ForegroundColor Green
        } catch {
            Write-Host "⚠️  Backend not detected on port 5001" -ForegroundColor Yellow
            Write-Host "   Please start backend first: cd backend && npm start" -ForegroundColor Gray
        }
        Write-Host ""
        
        $confirm = Read-Host "Continue? (y/n)"
        if ($confirm -eq "y") {
            Set-Location mobile
            Write-Host "Installing dependencies..." -ForegroundColor Yellow
            npm install
            Write-Host ""
            Write-Host "Starting Android app..." -ForegroundColor Green
            npm run android
        }
    }
    
    "2" {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host "Starting iOS App" -ForegroundColor Cyan
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host ""
        
        if ($PSVersionTable.Platform -ne "Unix" -and $PSVersionTable.OS -notlike "*Darwin*") {
            Write-Host "❌ iOS can only be built on macOS" -ForegroundColor Red
            exit 1
        }
        
        Write-Host "⚠️  Make sure:" -ForegroundColor Yellow
        Write-Host "   1. Backend is running on port 5001" -ForegroundColor Gray
        Write-Host "   2. Xcode is installed" -ForegroundColor Gray
        Write-Host "   3. CocoaPods is installed" -ForegroundColor Gray
        Write-Host "   4. iOS Simulator is available" -ForegroundColor Gray
        Write-Host ""
        
        $confirm = Read-Host "Continue? (y/n)"
        if ($confirm -eq "y") {
            Set-Location mobile
            Write-Host "Installing dependencies..." -ForegroundColor Yellow
            npm install
            Write-Host ""
            Write-Host "Installing iOS pods..." -ForegroundColor Yellow
            Set-Location ios
            pod install
            Set-Location ..
            Write-Host ""
            Write-Host "Starting iOS app..." -ForegroundColor Green
            npm run ios
        }
    }
    
    "3" {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host "Starting Windows App" -ForegroundColor Cyan
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "⚠️  Make sure:" -ForegroundColor Yellow
        Write-Host "   1. Backend is running on port 5001" -ForegroundColor Gray
        Write-Host "   2. Windows 10 SDK is installed" -ForegroundColor Gray
        Write-Host "   3. Visual Studio 2022 is installed" -ForegroundColor Gray
        Write-Host ""
        
        $confirm = Read-Host "Continue? (y/n)"
        if ($confirm -eq "y") {
            Set-Location mobile
            
            # Check if React Native Windows is initialized
            if (-not (Test-Path "windows")) {
                Write-Host "Initializing React Native Windows..." -ForegroundColor Yellow
                npx react-native-windows-init --overwrite
            }
            
            Write-Host "Installing dependencies..." -ForegroundColor Yellow
            npm install
            Write-Host ""
            Write-Host "Starting Windows app..." -ForegroundColor Green
            npx react-native run-windows
        }
    }
    
    "4" {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host "Installing Dependencies" -ForegroundColor Cyan
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host ""
        
        Set-Location mobile
        Write-Host "Installing npm packages..." -ForegroundColor Yellow
        npm install
        Write-Host ""
        Write-Host "✅ Dependencies installed successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Yellow
        Write-Host "1. Configure API_BASE_URL in src/services/api.js" -ForegroundColor Gray
        Write-Host "2. Start backend: cd backend && npm start" -ForegroundColor Gray
        Write-Host "3. Run this script again and select platform" -ForegroundColor Gray
    }
    
    default {
        Write-Host "Invalid choice. Exiting." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📱 Mobile App Information" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📚 Documentation:" -ForegroundColor Yellow
Write-Host "   - README_MOBILE.md - Complete overview" -ForegroundColor Gray
Write-Host "   - BUILD_GUIDE.md - Build instructions" -ForegroundColor Gray
Write-Host "   - QUICK_START_MOBILE.md - Quick setup" -ForegroundColor Gray
Write-Host "   - MOBILE_QUICK_REFERENCE.md - Command reference" -ForegroundColor Gray
Write-Host ""
Write-Host "🔧 Troubleshooting:" -ForegroundColor Yellow
Write-Host "   - Clear cache: npx react-native start --reset-cache" -ForegroundColor Gray
Write-Host "   - Clean Android: cd android && ./gradlew clean" -ForegroundColor Gray
Write-Host "   - Clean iOS: cd ios && rm -rf Pods && pod install" -ForegroundColor Gray
Write-Host ""
Write-Host "🌐 Network:" -ForegroundColor Yellow
Write-Host "   - Your IP: $ipAddress" -ForegroundColor Gray
Write-Host "   - Backend should be on: http://localhost:5001" -ForegroundColor Gray
Write-Host "   - For devices use: http://${ipAddress}:5001/api" -ForegroundColor Gray
Write-Host ""
Write-Host "✅ Done!" -ForegroundColor Green
