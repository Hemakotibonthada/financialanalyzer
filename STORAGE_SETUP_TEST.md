# Storage Setup - Quick Test Guide

## Test the Setup Wizard

### 1. Clean Installation Test

**Prepare:**
```powershell
# Delete settings to trigger setup
Remove-Item "$env:APPDATA\Financial Analyzer\settings.json" -ErrorAction SilentlyContinue
```

**Test:**
1. Run `FinancialAnalyzerSetup-1.0.0.exe`
2. Complete installation
3. Launch app
4. **Expected:** Setup wizard appears with two storage options

**Verify:**
- [ ] Setup window opens (650x700)
- [ ] Purple gradient header visible
- [ ] Two storage cards displayed
- [ ] Local option shows 💾 icon
- [ ] Online option shows ☁️ icon
- [ ] Features listed for each option
- [ ] Radio buttons work
- [ ] Continue button enabled when option selected

---

### 2. Local Storage Selection

**Test:**
1. Select "Local Storage (MongoDB)" option
2. Click "Continue"
3. Wait for setup to complete

**Verify:**
- [ ] Loading spinner appears
- [ ] Setup window closes
- [ ] Main app window opens
- [ ] Settings file created: `%APPDATA%\Financial Analyzer\settings.json`
- [ ] Settings contain:
   ```json
   {
     "storageType": "local",
     "setupCompleted": true,
     "setupDate": "..."
   }
   ```

**Prerequisites:**
- MongoDB running on localhost:27017
- Backend server running on localhost:5001

**Test App Functionality:**
1. Add an expense
2. Verify it appears in the list
3. Check MongoDB:
   ```bash
   mongosh
   use financial-analyzer
   db.expenses.find()
   ```

---

### 3. Online Storage Selection

**Prepare:**
```powershell
# Reset settings
Remove-Item "$env:APPDATA\Financial Analyzer\settings.json"
```

**Test:**
1. Launch app
2. Select "Online Storage (Firebase)" option
3. Click "Continue"
4. Wait for Firebase initialization

**Verify:**
- [ ] Firebase initializes successfully
- [ ] Setup window closes
- [ ] Main app opens
- [ ] Settings file shows `"storageType": "online"`
- [ ] Console shows: "Storage initialized: Firebase/Firestore"

**Test App Functionality:**
1. Add an expense
2. Verify it appears in the list
3. Check Firebase Console:
   - Go to Firebase Console
   - Open Firestore Database
   - Look for `expenses` collection

---

### 4. Setup Cancellation Test

**Test:**
1. Delete settings file
2. Launch app
3. **Don't select any option**
4. Close setup window (X button)

**Expected:**
- [ ] App quits when setup is cancelled
- [ ] No settings file created
- [ ] No main window appears

---

### 5. Persistence Test

**Test:**
1. Complete setup (either option)
2. Close app
3. Relaunch app

**Expected:**
- [ ] Setup wizard does NOT appear
- [ ] Main app window opens directly
- [ ] Same storage type is used
- [ ] Previous data is accessible

---

### 6. DevTools Verification

**Test:**
1. Launch app after setup
2. Open DevTools: `Ctrl+Shift+I`
3. Go to Console tab

**For Local Storage:**
```
Expected Console Output:
✓ App initialized with local storage
```

**For Online Storage:**
```
Expected Console Output:
✓ App initialized with online storage
✓ Firebase initialized
```

---

### 7. Settings File Location Test

**Verify:**
```powershell
# Check settings file exists
Test-Path "$env:APPDATA\Financial Analyzer\settings.json"

# View contents
Get-Content "$env:APPDATA\Financial Analyzer\settings.json" | ConvertFrom-Json
```

**Expected Structure:**
```json
{
  "storageType": "local" | "online",
  "setupCompleted": true,
  "setupDate": "2025-01-23T..."
}
```

---

### 8. Storage Switch Test

**Test Local → Online:**
```powershell
# Edit settings
$settings = Get-Content "$env:APPDATA\Financial Analyzer\settings.json" | ConvertFrom-Json
$settings.storageType = "online"
$settings | ConvertTo-Json | Set-Content "$env:APPDATA\Financial Analyzer\settings.json"

# Restart app
```

**Verify:**
- [ ] App uses Firebase
- [ ] No setup wizard appears
- [ ] Console shows "online storage"

**Test Online → Local:**
```powershell
# Edit settings
$settings = Get-Content "$env:APPDATA\Financial Analyzer\settings.json" | ConvertFrom-Json
$settings.storageType = "local"
$settings | ConvertTo-Json | Set-Content "$env:APPDATA\Financial Analyzer\settings.json"

# Restart app
```

**Verify:**
- [ ] App uses MongoDB
- [ ] No setup wizard appears
- [ ] Console shows "local storage"

---

### 9. Error Handling Tests

#### Test: MongoDB Not Running (Local)

**Setup:**
1. Select local storage
2. Ensure MongoDB is **NOT** running

**Expected:**
- [ ] App shows connection error
- [ ] Error message is user-friendly
- [ ] App doesn't crash

#### Test: No Internet (Online)

**Setup:**
1. Select online storage
2. Disconnect internet

**Expected:**
- [ ] Firebase offline persistence works
- [ ] Previously loaded data accessible
- [ ] Sync resumes when connected

---

### 10. Multi-Launch Test

**Test:**
1. Launch app
2. Try to launch second instance

**Expected:**
- [ ] Only one instance runs
- [ ] Second launch shows existing window
- [ ] No duplicate processes

---

## Quick Verification Checklist

### Setup Wizard
- [ ] Window size: 650x700
- [ ] Not resizable
- [ ] Purple gradient header
- [ ] Two storage option cards
- [ ] Icons display correctly
- [ ] Radio buttons functional
- [ ] Continue button works
- [ ] Loading state appears
- [ ] Window closes after setup

### Settings Persistence
- [ ] File created at correct location
- [ ] JSON format valid
- [ ] Contains all required fields
- [ ] setupCompleted is true
- [ ] setupDate is ISO timestamp

### Local Storage
- [ ] MongoDB connection works
- [ ] Backend API accessible
- [ ] Data saves correctly
- [ ] Data loads correctly
- [ ] CRUD operations work

### Online Storage
- [ ] Firebase initializes
- [ ] Firestore connection works
- [ ] Data syncs to cloud
- [ ] Offline persistence enabled
- [ ] Authentication works

### App Behavior
- [ ] Setup wizard on first launch only
- [ ] Main app on subsequent launches
- [ ] Correct storage type used
- [ ] No crashes or errors
- [ ] Smooth transitions

---

## Common Issues & Solutions

### Setup Wizard Doesn't Appear
```powershell
# Solution: Delete settings and restart
Remove-Item "$env:APPDATA\Financial Analyzer\settings.json"
```

### Firebase Not Working
```javascript
// Check console for errors
// Verify internet connection
// Check Firebase config in firebase.js
```

### MongoDB Connection Failed
```bash
# Start MongoDB
.\start-mongodb.ps1

# Check if running
mongosh --eval "db.version()"
```

### Settings File Not Found
```powershell
# Check path
Write-Host "$env:APPDATA\Financial Analyzer"

# Create directory if missing
New-Item -ItemType Directory -Path "$env:APPDATA\Financial Analyzer" -Force
```

---

## Performance Metrics

### Setup Time
- **Local**: < 1 second
- **Online**: 2-3 seconds (Firebase init)

### First Data Operation
- **Local**: < 100ms
- **Online**: 200-500ms (network dependent)

### Subsequent Operations
- **Local**: < 50ms
- **Online**: < 100ms (cached)

---

## Developer Testing

### Check IPC Communication
```javascript
// In setup.html (DevTools Console)
window.electron.saveStorageSettings({ storageType: 'local' })
  .then(result => console.log('Save result:', result))

window.electron.getStorageSettings()
  .then(settings => console.log('Loaded settings:', settings))
```

### Check Storage Service
```javascript
// In main app (DevTools Console)
import { getStorageType } from './services/storage'
console.log('Current storage:', getStorageType())
```

### Monitor Firebase Operations
```javascript
// Enable Firestore logging
import { enableLogging } from 'firebase/firestore'
enableLogging(true)
```

---

## Automated Test Script

```powershell
# Full test automation
$ErrorActionPreference = "Stop"

Write-Host "=== Financial Analyzer Setup Test ===" -ForegroundColor Cyan

# Test 1: Clean state
Write-Host "`n[Test 1] Cleaning settings..." -ForegroundColor Yellow
Remove-Item "$env:APPDATA\Financial Analyzer\settings.json" -ErrorAction SilentlyContinue
Write-Host "✓ Settings cleaned" -ForegroundColor Green

# Test 2: Check installer
Write-Host "`n[Test 2] Checking installer..." -ForegroundColor Yellow
$installer = "dist\FinancialAnalyzerSetup-1.0.0.exe"
if (Test-Path $installer) {
    Write-Host "✓ Installer found: $installer" -ForegroundColor Green
    $size = (Get-Item $installer).Length / 1MB
    Write-Host "  Size: $([math]::Round($size, 2)) MB" -ForegroundColor Gray
} else {
    Write-Host "✗ Installer not found" -ForegroundColor Red
    exit 1
}

# Test 3: Verify setup files
Write-Host "`n[Test 3] Checking setup files..." -ForegroundColor Yellow
$files = @(
    "desktop\setup.html",
    "desktop\preload.js",
    "desktop\main.js",
    "frontend\src\services\firebase.js",
    "frontend\src\services\storage.js"
)
foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "✓ Found: $file" -ForegroundColor Green
    } else {
        Write-Host "✗ Missing: $file" -ForegroundColor Red
    }
}

# Test 4: Check MongoDB
Write-Host "`n[Test 4] Checking MongoDB..." -ForegroundColor Yellow
try {
    $mongoTest = mongosh --eval "db.version()" --quiet 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ MongoDB running" -ForegroundColor Green
    } else {
        Write-Host "⚠ MongoDB not running" -ForegroundColor Yellow
        Write-Host "  Start with: .\start-mongodb.ps1" -ForegroundColor Gray
    }
} catch {
    Write-Host "⚠ MongoDB not installed or not in PATH" -ForegroundColor Yellow
}

# Test 5: Check Node modules
Write-Host "`n[Test 5] Checking Firebase dependency..." -ForegroundColor Yellow
$packageJson = Get-Content "frontend\package.json" | ConvertFrom-Json
if ($packageJson.dependencies.firebase) {
    Write-Host "✓ Firebase installed: $($packageJson.dependencies.firebase)" -ForegroundColor Green
} else {
    Write-Host "✗ Firebase not found in dependencies" -ForegroundColor Red
}

Write-Host "`n=== Test Summary ===" -ForegroundColor Cyan
Write-Host "Ready for manual testing!" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Yellow
Write-Host "1. Run installer: .\dist\FinancialAnalyzerSetup-1.0.0.exe"
Write-Host "2. Complete installation"
Write-Host "3. Launch app and test setup wizard"
Write-Host "4. Verify storage functionality"
```

**Run the test:**
```powershell
.\test-setup-wizard.ps1
```

---

## Success Criteria

Setup wizard is successful if:

✅ **Visual**
- Setup window displays correctly
- All UI elements visible
- Colors and gradients render
- Icons show properly

✅ **Functional**
- Radio selection works
- Continue button responds
- Settings save correctly
- Main app launches after setup

✅ **Persistence**
- Settings file created
- Correct storage type saved
- Setup doesn't repeat on relaunch

✅ **Integration**
- Local storage connects to MongoDB
- Online storage connects to Firebase
- Data operations work correctly
- No console errors

---

*Test all scenarios before production deployment*
*Report any issues with screenshots and logs*
