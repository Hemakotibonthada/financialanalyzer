# Financial Analyzer - Firewall Setup Script
# Run this script as Administrator to allow network access

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Financial Analyzer - Firewall Setup" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "❌ Error: This script must be run as Administrator!" -ForegroundColor Red
    Write-Host "Right-click on PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "✅ Running with Administrator privileges`n" -ForegroundColor Green

# Remove existing rules if they exist
Write-Host "Removing old firewall rules (if any)..." -ForegroundColor Yellow
netsh advfirewall firewall delete rule name="Financial Analyzer Frontend" 2>$null
netsh advfirewall firewall delete rule name="Financial Analyzer Backend" 2>$null

# Add new rules
Write-Host "`nAdding firewall rule for Frontend (Port 3000)..." -ForegroundColor Yellow
$result1 = netsh advfirewall firewall add rule name="Financial Analyzer Frontend" dir=in action=allow protocol=TCP localport=3000

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Frontend firewall rule added successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to add Frontend firewall rule" -ForegroundColor Red
}

Write-Host "`nAdding firewall rule for Backend (Port 5001)..." -ForegroundColor Yellow
$result2 = netsh advfirewall firewall add rule name="Financial Analyzer Backend" dir=in action=allow protocol=TCP localport=5001

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Backend firewall rule added successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to add Backend firewall rule" -ForegroundColor Red
}

# Get network IP
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Network Information" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$networkIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike "*Loopback*" -and $_.IPAddress -notlike "169.254.*" } | Select-Object -First 1).IPAddress

Write-Host "`n📱 Access your application from other devices:" -ForegroundColor Green
Write-Host "   Frontend: http://$networkIP:3000" -ForegroundColor White
Write-Host "   Backend:  http://$networkIP:5001" -ForegroundColor White

Write-Host "`n✅ Firewall setup complete!" -ForegroundColor Green
Write-Host "`nNote: Make sure both servers are running:" -ForegroundColor Yellow
Write-Host "   - Backend: cd backend && node server.js" -ForegroundColor White
Write-Host "   - Frontend: cd frontend && npm run dev" -ForegroundColor White

Write-Host "`n" -ForegroundColor White
Read-Host "Press Enter to exit"
