# MongoDB Startup Script
# Run this with Administrator privileges: Right-click → Run as Administrator

Write-Host "🚀 Starting MongoDB Service..." -ForegroundColor Cyan

# Method 1: Try starting the Windows service
try {
    Start-Service MongoDB -ErrorAction Stop
    Write-Host "✅ MongoDB service started successfully!" -ForegroundColor Green
    Get-Service MongoDB | Format-Table -AutoSize
}
catch {
    Write-Host "⚠️  Failed to start MongoDB service. Trying direct method..." -ForegroundColor Yellow
    
    # Method 2: Start mongod directly
    $mongoPath = "C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe"
    $dataPath = "C:\data\db"
    
    # Create data directory if it doesn't exist
    if (-not (Test-Path $dataPath)) {
        Write-Host "📁 Creating data directory: $dataPath" -ForegroundColor Yellow
        New-Item -ItemType Directory -Path $dataPath -Force | Out-Null
    }
    
    Write-Host "🔧 Starting MongoDB directly..." -ForegroundColor Cyan
    Start-Process -FilePath $mongoPath -ArgumentList "--dbpath `"$dataPath`" --port 27017" -WindowStyle Minimized
    
    Start-Sleep -Seconds 3
    Write-Host "✅ MongoDB started in background!" -ForegroundColor Green
}

Write-Host ""
Write-Host "📊 MongoDB Connection Details:" -ForegroundColor Cyan
Write-Host "   Host: localhost" -ForegroundColor White
Write-Host "   Port: 27017" -ForegroundColor White
Write-Host "   Database: financial_analyzer" -ForegroundColor White
Write-Host ""
Write-Host "💡 To check if MongoDB is running:" -ForegroundColor Yellow
Write-Host "   Get-Process mongod" -ForegroundColor White
Write-Host ""
Write-Host "🛑 To stop MongoDB:" -ForegroundColor Yellow
Write-Host "   Stop-Process -Name mongod" -ForegroundColor White
