# Build script for Financial Analyzer Desktop App

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║      Financial Analyzer - Desktop Installer Builder       ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$ErrorActionPreference = "Stop"
$startTime = Get-Date

try {
    # Get project root
    $projectRoot = Split-Path -Parent $PSScriptRoot
    Write-Host "📁 Project root: $projectRoot" -ForegroundColor Gray
    Write-Host ""

    # Step 1: Build Frontend
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
    Write-Host "[1/2] Building Frontend..." -ForegroundColor Yellow
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
    
    $frontendPath = Join-Path $projectRoot "frontend"
    Set-Location $frontendPath
    
    Write-Host "📦 Running: npm run build" -ForegroundColor Gray
    npm run build
    
    if ($LASTEXITCODE -ne 0) {
        throw "Frontend build failed with exit code $LASTEXITCODE"
    }
    
    # Check if dist folder was created
    $distPath = Join-Path $frontendPath "dist"
    if (-not (Test-Path $distPath)) {
        throw "Frontend build completed but dist folder not found!"
    }
    
    $distSize = (Get-ChildItem $distPath -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB
    Write-Host "✅ Frontend built successfully!" -ForegroundColor Green
    Write-Host "   Size: $([math]::Round($distSize, 2)) MB" -ForegroundColor Gray
    Write-Host ""

    # Step 2: Build Desktop Installer
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
    Write-Host "[2/2] Building Desktop Installer..." -ForegroundColor Yellow
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
    
    $desktopPath = Join-Path $projectRoot "desktop"
    Set-Location $desktopPath
    
    Write-Host "📦 Running: npm run dist" -ForegroundColor Gray
    Write-Host "⏳ This may take 2-5 minutes on first build..." -ForegroundColor DarkYellow
    Write-Host ""
    
    npm run dist
    
    if ($LASTEXITCODE -ne 0) {
        throw "Desktop build failed with exit code $LASTEXITCODE"
    }
    
    Write-Host ""
    Write-Host "✅ Desktop installer built successfully!" -ForegroundColor Green
    Write-Host ""

    # Display results
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
    Write-Host "📦 Build Output" -ForegroundColor Cyan
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
    Write-Host ""
    
    $outputPath = Join-Path $desktopPath "dist"
    
    if (Test-Path $outputPath) {
        $files = Get-ChildItem $outputPath -File | Sort-Object Length -Descending
        
        foreach ($file in $files) {
            $sizeInMB = [math]::Round($file.Length / 1MB, 2)
            $icon = "📦"
            
            if ($file.Extension -eq ".exe") {
                if ($file.Name -like "*Setup*") {
                    $icon = "💾"
                    Write-Host "$icon $($file.Name)" -ForegroundColor Green
                } elseif ($file.Name -like "*Portable*") {
                    $icon = "🎒"
                    Write-Host "$icon $($file.Name)" -ForegroundColor Yellow
                } else {
                    Write-Host "$icon $($file.Name)" -ForegroundColor White
                }
            } else {
                Write-Host "$icon $($file.Name)" -ForegroundColor Gray
            }
            
            Write-Host "   └─ Size: $sizeInMB MB" -ForegroundColor DarkGray
        }
        
        Write-Host ""
        Write-Host "📁 Output location:" -ForegroundColor Cyan
        Write-Host "   $outputPath" -ForegroundColor White
    }

    # Calculate total time
    $endTime = Get-Date
    $duration = $endTime - $startTime
    $minutes = [math]::Floor($duration.TotalMinutes)
    $seconds = $duration.Seconds
    
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
    Write-Host "✨ Build Complete!" -ForegroundColor Green
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "⏱️  Total time: $minutes min $seconds sec" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "🎯 Next steps:" -ForegroundColor Yellow
    Write-Host "   1. Test installer: .\dist\FinancialAnalyzerSetup-1.0.0.exe" -ForegroundColor White
    Write-Host "   2. Verify desktop shortcut is created" -ForegroundColor White
    Write-Host "   3. Test app functionality" -ForegroundColor White
    Write-Host "   4. Share installer with users" -ForegroundColor White
    Write-Host ""
    Write-Host "📝 User instructions:" -ForegroundColor Yellow
    Write-Host "   • Double-click installer to install" -ForegroundColor White
    Write-Host "   • Desktop shortcut will be created automatically" -ForegroundColor White
    Write-Host "   • Launch from desktop icon or Start menu" -ForegroundColor White
    Write-Host ""

} catch {
    Write-Host ""
    Write-Host "❌ Build failed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Troubleshooting:" -ForegroundColor Yellow
    Write-Host "   • Ensure all dependencies are installed: npm install" -ForegroundColor White
    Write-Host "   • Check if backend is not occupying resources" -ForegroundColor White
    Write-Host "   • Try building frontend separately: cd frontend && npm run build" -ForegroundColor White
    Write-Host "   • Check BUILD_INSTALLER_GUIDE.md for details" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "Press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
