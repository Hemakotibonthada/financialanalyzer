# Generate Secure JWT Secrets for Production
# Run this script to generate cryptographically secure random secrets

Write-Host "`n🔐 Generating Secure JWT Secrets...`n" -ForegroundColor Cyan

# Generate JWT_SECRET (32 bytes = 256 bits)
$bytes1 = New-Object byte[] 32
$rng = [System.Security.Cryptography.RNGCryptoServiceProvider]::Create()
$rng.GetBytes($bytes1)
$JWT_SECRET = [Convert]::ToBase64String($bytes1)

# Generate JWT_REFRESH_SECRET (32 bytes = 256 bits)
$bytes2 = New-Object byte[] 32
$rng.GetBytes($bytes2)
$JWT_REFRESH_SECRET = [Convert]::ToBase64String($bytes2)

# Generate SESSION_SECRET (32 bytes = 256 bits)
$bytes3 = New-Object byte[] 32
$rng.GetBytes($bytes3)
$SESSION_SECRET = [Convert]::ToBase64String($bytes3)

# Generate ENCRYPTION_KEY (32 bytes = 256 bits for AES-256)
$bytes4 = New-Object byte[] 32
$rng.GetBytes($bytes4)
$ENCRYPTION_KEY = [Convert]::ToBase64String($bytes4)

# Display results
Write-Host "✅ Generated Secrets (Copy these to your .env file):`n" -ForegroundColor Green

Write-Host "JWT_SECRET=" -NoNewline -ForegroundColor Yellow
Write-Host $JWT_SECRET -ForegroundColor White

Write-Host "JWT_REFRESH_SECRET=" -NoNewline -ForegroundColor Yellow
Write-Host $JWT_REFRESH_SECRET -ForegroundColor White

Write-Host "SESSION_SECRET=" -NoNewline -ForegroundColor Yellow
Write-Host $SESSION_SECRET -ForegroundColor White

Write-Host "ENCRYPTION_KEY=" -NoNewline -ForegroundColor Yellow
Write-Host $ENCRYPTION_KEY -ForegroundColor White

# Save to file
$outputFile = "generated-secrets.txt"
$content = @"
# Generated Secrets - $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
# ⚠️ KEEP THIS FILE SECURE - DO NOT COMMIT TO GIT

JWT_SECRET=$JWT_SECRET
JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET
SESSION_SECRET=$SESSION_SECRET
ENCRYPTION_KEY=$ENCRYPTION_KEY

# Instructions:
# 1. Copy these values to your .env file
# 2. Delete this file after copying
# 3. Restart your backend server
# 4. Clear all browser tokens (users need to log in again)
"@

$content | Out-File -FilePath $outputFile -Encoding UTF8

Write-Host "`n💾 Secrets saved to: $outputFile" -ForegroundColor Cyan
Write-Host "⚠️  Remember to delete this file after copying to .env!`n" -ForegroundColor Yellow

# Copy to clipboard if available
try {
    $clipboardContent = @"
JWT_SECRET=$JWT_SECRET
JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET
SESSION_SECRET=$SESSION_SECRET
ENCRYPTION_KEY=$ENCRYPTION_KEY
"@
    $clipboardContent | Set-Clipboard
    Write-Host "📋 Secrets copied to clipboard!`n" -ForegroundColor Green
} catch {
    Write-Host "ℹ️  Clipboard not available, please copy manually from $outputFile`n" -ForegroundColor Gray
}

Write-Host "Next Steps:" -ForegroundColor Magenta
Write-Host "1. Update backend/.env with the generated secrets" -ForegroundColor White
Write-Host "2. Restart the backend server" -ForegroundColor White
Write-Host "3. Clear browser tokens (open clear-tokens.html)" -ForegroundColor White
Write-Host "4. Log in again to get fresh tokens`n" -ForegroundColor White
