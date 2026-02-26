# Build Windows Installer - Quick Guide

## 🎯 Goal
Create `FinancialAnalyzerSetup-1.0.0.exe` installer that:
- Installs the app with one click
- Creates desktop shortcut automatically  
- Creates start menu entry
- Allows custom installation location

## ⚡ Quick Build (3 Steps)

### Step 1: Build Frontend (Required First!)

```powershell
# From project root
cd frontend
npm run build
```

**Expected**: `frontend/dist/` folder created with files
**Time**: 1-2 minutes

### Step 2: Build Desktop Installer

```powershell
# From project root
cd desktop
npm run dist
```

**Expected**: `desktop/dist/FinancialAnalyzerSetup-1.0.0.exe` created
**Time**: 2-5 minutes (first build), 30-60 seconds (subsequent)

### Step 3: Test Installer

```powershell
# Double-click the installer
.\dist\FinancialAnalyzerSetup-1.0.0.exe
```

**Expected**:
1. Installation wizard opens
2. Choose install location (or use default)
3. Progress bar shows installation
4. Desktop shortcut created ✅
5. Start menu entry created ✅
6. App launches (if "Run after install" checked)

## 📦 Output Files

After building, you'll find in `desktop/dist/`:

```
FinancialAnalyzerSetup-1.0.0.exe         (~100 MB)
  ↳ Full installer with desktop shortcut creation

FinancialAnalyzer-Portable-1.0.0.exe     (~150 MB)
  ↳ Portable version (no installation, runs from anywhere)

win-unpacked/                             (~200 MB)
  ↳ Unpacked app files (for testing)
```

## 🎯 Distribution

### Share with Users

**Option 1: Direct Share**
- Send `FinancialAnalyzerSetup-1.0.0.exe` via email/USB/cloud
- User double-clicks → Installs → Desktop icon created

**Option 2: Portable Version**
- Share `FinancialAnalyzer-Portable-1.0.0.exe`
- No installation needed
- Runs from USB or any folder

## ✅ What Users Experience

### Installation Process

1. **Double-click** `FinancialAnalyzerSetup-1.0.0.exe`
2. **Welcome Screen** - Shows app name and version
3. **License Agreement** - Click "I Agree"
4. **Installation Folder** - Choose location or use default:
   ```
   C:\Program Files\Financial Analyzer
   ```
5. **Progress Bar** - Shows "Installing..."
6. **Completion** - Options:
   - ✅ Run Financial Analyzer (checked by default)
   - Click "Finish"

### After Installation

**Desktop Shortcut** ✅
- Icon appears on desktop with your app icon
- Named "Financial Analyzer"
- Double-click to launch app

**Start Menu** ✅
- Found in: Start → All Programs → Financial Analyzer
- Click to launch

**System Tray** ✅
- App minimizes to tray icon
- Right-click for quick menu

### Uninstallation

**Method 1**: Control Panel
1. Control Panel → Programs → Uninstall a program
2. Select "Financial Analyzer"
3. Click Uninstall

**Method 2**: Start Menu
1. Start → All Programs → Financial Analyzer
2. Click "Uninstall Financial Analyzer"

## 🔧 Build Configuration

The installer is configured in `desktop/package.json`:

```json
{
  "build": {
    "win": {
      "target": ["nsis", "portable"]  // ← Creates installer + portable
    },
    "nsis": {
      "oneClick": false,                      // ← Shows options dialog
      "allowToChangeInstallationDirectory": true,  // ← Choose location
      "createDesktopShortcut": true,          // ← Desktop icon ✅
      "createStartMenuShortcut": true,        // ← Start menu ✅
      "runAfterFinish": true                  // ← Launch after install
    }
  }
}
```

## 🎨 Customize Before Building (Optional)

### Change App Name
Edit `desktop/package.json`:
```json
{
  "productName": "Your App Name",  // ← Changes display name
  "version": "1.0.0"               // ← Version number
}
```

### Replace Icons
Replace these files before building:
```
desktop/assets/icon.png (256x256)
desktop/assets/tray-icon.png (32x32)
```

### Change Installer Name
Edit `desktop/package.json`:
```json
{
  "build": {
    "nsis": {
      "artifactName": "MyApp-Setup-${version}.${ext}"  // ← Installer name
    }
  }
}
```

## 🐛 Troubleshooting

### Error: "Cannot find module '../frontend/dist'"

**Problem**: Frontend not built

**Solution**:
```powershell
cd frontend
npm run build
```

### Error: "electron-builder not found"

**Problem**: Dependencies not installed

**Solution**:
```powershell
cd desktop
npm install
```

### Build succeeds but installer won't run

**Problem**: Antivirus blocking unsigned app

**Solution**:
- Temporarily disable antivirus during testing
- For production: Code sign the installer (requires certificate)

### Icons not showing in built app

**Problem**: Icon files missing or wrong path

**Solution**:
```powershell
# Regenerate icons
cd desktop
node create-icons-sharp.js

# Verify files exist
dir assets\*.png
```

## ⚙️ Advanced Options

### Build for 32-bit Windows

Edit `desktop/package.json`:
```json
{
  "build": {
    "win": {
      "target": [
        { "target": "nsis", "arch": ["ia32"] }  // ← 32-bit
      ]
    }
  }
}
```

### Create ZIP Package

```powershell
npm run build -- --win --x64 zip
```

### Skip Portable Version

Edit `desktop/package.json`:
```json
{
  "build": {
    "win": {
      "target": ["nsis"]  // ← Only installer, no portable
    }
  }
}
```

## 📊 Build Sizes

| Output | Size | Description |
|--------|------|-------------|
| Installer (.exe) | ~100 MB | Compressed installer |
| Portable (.exe) | ~150 MB | Standalone executable |
| Installed Size | ~200 MB | After installation |
| Frontend (dist) | ~5 MB | React build |
| Electron Runtime | ~150 MB | Bundled with app |

## 🚀 Production Checklist

Before distributing to users:

- [ ] Frontend builds successfully
- [ ] Desktop app tested in dev mode
- [ ] All features working
- [ ] Backend deployment plan ready
- [ ] Icons replaced with custom designs (optional)
- [ ] Version number updated
- [ ] Installer tested on clean Windows PC
- [ ] Desktop shortcut works
- [ ] Start menu entry works
- [ ] App launches and connects to backend
- [ ] Uninstaller tested

## 🎯 One-Command Build (All Steps)

Create a build script `desktop/build-all.ps1`:

```powershell
# Build script
Write-Host "Building Financial Analyzer Desktop App..." -ForegroundColor Green

# Step 1: Build Frontend
Write-Host "`n[1/2] Building frontend..." -ForegroundColor Cyan
Set-Location ..\frontend
npm run build

# Step 2: Build Desktop Installer
Write-Host "`n[2/2] Building desktop installer..." -ForegroundColor Cyan
Set-Location ..\desktop
npm run dist

Write-Host "`n✅ Build complete!" -ForegroundColor Green
Write-Host "Installer: desktop\dist\FinancialAnalyzerSetup-1.0.0.exe" -ForegroundColor Yellow
```

Run with:
```powershell
cd desktop
.\build-all.ps1
```

## 📝 Summary

### To Build Installer:
```powershell
# 1. Build frontend
cd frontend && npm run build

# 2. Build installer
cd ../desktop && npm run dist

# 3. Find installer
# Output: desktop/dist/FinancialAnalyzerSetup-1.0.0.exe
```

### To Test:
```powershell
# Run installer
cd desktop
.\dist\FinancialAnalyzerSetup-1.0.0.exe
```

### To Distribute:
- Share `FinancialAnalyzerSetup-1.0.0.exe` (100 MB)
- Users double-click → Installs → Desktop icon created ✅

---

**Total time to build**: ~3-5 minutes
**Installer size**: ~100 MB
**What users get**: Professional Windows app with desktop shortcut ✅

Ready to build? Run the commands above! 🚀
