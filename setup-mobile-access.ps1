# Mobile Access Setup Script
# Run this script as Administrator

Write-Host ""
Write-Host "📱 Financial Analyzer - Mobile Access Setup" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "❌ Error: This script must be run as Administrator" -ForegroundColor Red
    Write-Host ""
    Write-Host "To run as Administrator:" -ForegroundColor Yellow
    Write-Host "1. Right-click PowerShell" -ForegroundColor Yellow
    Write-Host "2. Select 'Run as Administrator'" -ForegroundColor Yellow
    Write-Host "3. Run this script again" -ForegroundColor Yellow
    Write-Host ""
    pause
    exit 1
}

Write-Host "✅ Running with Administrator privileges" -ForegroundColor Green
Write-Host ""

# Step 1: Configure Firewall
Write-Host "🔧 Step 1: Configuring Windows Firewall..." -ForegroundColor Yellow
Write-Host ""

# Check if rules already exist
$rule3000 = Get-NetFirewallRule -DisplayName "Node.js Port 3000" -ErrorAction SilentlyContinue
$rule5001 = Get-NetFirewallRule -DisplayName "Node.js Port 5001" -ErrorAction SilentlyContinue

if ($rule3000) {
    Write-Host "   ℹ️  Firewall rule for port 3000 already exists" -ForegroundColor Cyan
    Write-Host "   Removing old rule..." -ForegroundColor Yellow
    Remove-NetFirewallRule -DisplayName "Node.js Port 3000"
}

if ($rule5001) {
    Write-Host "   ℹ️  Firewall rule for port 5001 already exists" -ForegroundColor Cyan
    Write-Host "   Removing old rule..." -ForegroundColor Yellow
    Remove-NetFirewallRule -DisplayName "Node.js Port 5001"
}

# Add new rules
try {
    New-NetFirewallRule -DisplayName "Node.js Port 3000" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3000 | Out-Null
    Write-Host "   ✅ Added firewall rule for port 3000 (Frontend)" -ForegroundColor Green
    
    New-NetFirewallRule -DisplayName "Node.js Port 5001" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 5001 | Out-Null
    Write-Host "   ✅ Added firewall rule for port 5001 (Backend)" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "   ❌ Error adding firewall rules: $_" -ForegroundColor Red
    Write-Host ""
    exit 1
}

# Step 2: Get Network IP
Write-Host "🌐 Step 2: Detecting Network Configuration..." -ForegroundColor Yellow
Write-Host ""

$networkIP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notlike "*Loopback*" -and $_.IPAddress -notlike "169.254.*" } | Select-Object -First 1).IPAddress

if ($networkIP) {
    Write-Host "   ✅ Network IP Address: $networkIP" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Host "   ❌ Could not detect network IP address" -ForegroundColor Red
    Write-Host "   Please ensure you are connected to a network" -ForegroundColor Yellow
    Write-Host ""
    pause
    exit 1
}

# Step 3: Configure Application
Write-Host "⚙️  Step 3: Configuring Application..." -ForegroundColor Yellow
Write-Host ""

# Run node script to configure
try {
    node setup-network.js network
    Write-Host ""
} catch {
    Write-Host "   ❌ Error running configuration script: $_" -ForegroundColor Red
    Write-Host ""
}

# Step 4: Display Summary
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "✅ Setup Complete!" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📱 Mobile Access URLs:" -ForegroundColor Cyan
Write-Host "   Frontend: http://$networkIP:3000" -ForegroundColor White
Write-Host "   Backend:  http://$networkIP:5001" -ForegroundColor White
Write-Host "   API:      http://$networkIP:5001/api" -ForegroundColor White
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Yellow
Write-Host "   1. Start Backend:  cd backend && npm start" -ForegroundColor White
Write-Host "   2. Start Frontend: cd frontend && npm run dev" -ForegroundColor White
Write-Host "   3. Open mobile browser and navigate to: http://$networkIP:3000" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  Important:" -ForegroundColor Yellow
Write-Host "   • Ensure mobile and PC are on the SAME Wi-Fi network" -ForegroundColor White
Write-Host "   • Restart frontend after configuration: cd frontend && npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "📖 For detailed instructions, see MOBILE_ACCESS_GUIDE.md" -ForegroundColor Cyan
Write-Host ""
pause
