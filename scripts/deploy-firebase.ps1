# Quick Deploy Script for Financial Analyzer

Write-Host "🚀 Financial Analyzer - Firebase Deployment" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Check if Firebase CLI is installed
Write-Host "📦 Checking Firebase CLI..." -ForegroundColor Yellow
$firebaseVersion = firebase --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Firebase CLI not found. Installing..." -ForegroundColor Red
    npm install -g firebase-tools
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install Firebase CLI" -ForegroundColor Red
        exit 1
    }
}
Write-Host "✅ Firebase CLI installed" -ForegroundColor Green
Write-Host ""

# Login to Firebase
Write-Host "🔐 Checking Firebase login..." -ForegroundColor Yellow
firebase login:ci
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Firebase login failed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Logged in to Firebase" -ForegroundColor Green
Write-Host ""

# Build Frontend
Write-Host "🏗️  Building frontend..." -ForegroundColor Yellow
Set-Location frontend
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Frontend dependencies installation failed" -ForegroundColor Red
    Set-Location ..
    exit 1
}

npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Frontend build failed" -ForegroundColor Red
    Set-Location ..
    exit 1
}
Write-Host "✅ Frontend built successfully" -ForegroundColor Green
Set-Location ..
Write-Host ""

# Install Functions Dependencies
Write-Host "📦 Installing Cloud Functions dependencies..." -ForegroundColor Yellow
Set-Location functions
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Functions dependencies installation failed" -ForegroundColor Red
    Set-Location ..
    exit 1
}
Write-Host "✅ Functions dependencies installed" -ForegroundColor Green
Set-Location ..
Write-Host ""

# Deploy to Firebase
Write-Host "🚀 Deploying to Firebase..." -ForegroundColor Yellow
Write-Host ""

# Ask user what to deploy
Write-Host "Select deployment option:" -ForegroundColor Cyan
Write-Host "1. Deploy everything (Hosting + Functions + Rules)" -ForegroundColor White
Write-Host "2. Deploy frontend only (Hosting)" -ForegroundColor White
Write-Host "3. Deploy backend only (Functions)" -ForegroundColor White
Write-Host "4. Deploy rules only (Firestore + Storage)" -ForegroundColor White
Write-Host "5. Cancel" -ForegroundColor White
Write-Host ""

$choice = Read-Host "Enter your choice (1-5)"

switch ($choice) {
    "1" {
        Write-Host "📦 Deploying everything..." -ForegroundColor Yellow
        firebase deploy
    }
    "2" {
        Write-Host "🌐 Deploying frontend (Hosting)..." -ForegroundColor Yellow
        firebase deploy --only hosting
    }
    "3" {
        Write-Host "⚙️  Deploying backend (Functions)..." -ForegroundColor Yellow
        firebase deploy --only functions
    }
    "4" {
        Write-Host "🔒 Deploying security rules..." -ForegroundColor Yellow
        firebase deploy --only firestore:rules,storage
    }
    "5" {
        Write-Host "❌ Deployment cancelled" -ForegroundColor Red
        exit 0
    }
    default {
        Write-Host "❌ Invalid choice" -ForegroundColor Red
        exit 1
    }
}

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Troubleshooting tips:" -ForegroundColor Yellow
    Write-Host "1. Check Firebase project is set: firebase use finserveassist" -ForegroundColor White
    Write-Host "2. Verify you're logged in: firebase login" -ForegroundColor White
    Write-Host "3. Check functions/package.json has correct Node version" -ForegroundColor White
    Write-Host "4. Review error messages above" -ForegroundColor White
    exit 1
}

Write-Host ""
Write-Host "✅ Deployment successful!" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Your application is live at:" -ForegroundColor Cyan
Write-Host "   Frontend: https://finserveassist.web.app" -ForegroundColor White
Write-Host "   API: https://us-central1-finserveassist.cloudfunctions.net/api" -ForegroundColor White
Write-Host ""
Write-Host "📊 View in Firebase Console:" -ForegroundColor Cyan
Write-Host "   https://console.firebase.google.com/project/finserveassist" -ForegroundColor White
Write-Host ""
Write-Host "🎉 Deployment complete!" -ForegroundColor Green
