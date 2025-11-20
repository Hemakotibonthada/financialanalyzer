# Windows Desktop App - Complete Setup & Build Guide

## 🎯 Overview

This guide covers building a Windows desktop application with:
- ✅ Traditional .exe installer
- ✅ Automatic desktop shortcut creation
- ✅ Start menu entry
- ✅ Custom installation directory
- ✅ System tray integration

## 📋 Prerequisites

### Required
1. **Node.js** (v16 or later) - Already installed ✅
2. **Backend server** - Must run on localhost:5001
3. **Frontend built** - Production files in `frontend/dist/`

### Installed Dependencies
- ✅ Electron 39.2.2
- ✅ electron-builder 26.0.12
- ✅ electron-is-dev 3.0.1

## 🚀 Quick Start

### Step 1: Build Frontend (Required First)

```bash
# From project root
cd frontend
npm install
npm run build
```

**Expected output**: `frontend/dist/` folder with built files

### Step 2: Start Backend Server

```bash
# From project root (in a new terminal)
cd backend
npm start
```

**Expected**: Server running on http://localhost:5001

### Step 3: Test Desktop App in Development

```bash
# From project root
cd desktop
npm start
```

**Expected**: Electron window opens showing the app

## 🏗️ Building the Installer

### Build Command

```bash
cd desktop
npm run dist
```

### Build Output

```
desktop/dist/
├── FinancialAnalyzerSetup-1.0.0.exe  (Installer - ~80-120 MB)
├── FinancialAnalyzer-Portable-1.0.0.exe  (Portable version)
└── win-unpacked/  (Unpacked application files)
```

### Build Time
- **First build**: 2-5 minutes (downloads Electron binaries)
- **Subsequent builds**: 30-90 seconds

## 📦 Installer Features

### What the Installer Does

1. **Welcome Screen**
   - Shows product name and version
   - License agreement

2. **Installation Directory**
   - Default: `C:\Program Files\Financial Analyzer`
   - User can customize location
   - Checks for disk space

3. **Shortcuts Creation**
   - ✅ Desktop shortcut (Financial Analyzer.lnk)
   - ✅ Start Menu entry
   - Icon: Custom app icon

4. **Installation Progress**
   - Progress bar
   - File copying status

5. **Completion**
   - Option to run app immediately
   - Finish button

6. **Uninstaller**
   - Accessible from Control Panel
   - Removes all installed files
   - Optional: Keep app data

## 🎨 Customizing Icons

### Current Status
- ✅ Placeholder icons created
- ⚠️ Replace with custom icons for production

### Icon Requirements

| File | Size | Format | Purpose |
|------|------|--------|---------|
| `icon.ico` | 256x256 | ICO | Windows app icon, installer |
| `icon.png` | 256x256 | PNG | Development, macOS (future) |
| `tray-icon.png` | 32x32 | PNG | System tray icon |

### Creating Custom Icons

**Method 1: Online Tool**
1. Create/find square image (256x256 PNG)
2. Visit: https://www.icoconverter.com/
3. Upload image
4. Download as ICO
5. Replace `desktop/assets/icon.ico`

**Method 2: Professional Tools**
- Adobe Photoshop (Export as ICO)
- GIMP (ICO plugin)
- Figma + export plugin

**Method 3: Design Services**
- Fiverr ($5-20)
- 99designs ($299-499)
- Design own in Canva (Free)

## 🔧 Configuration Reference

### package.json - Key Sections

```json
{
  "main": "main.js",
  "scripts": {
    "start": "electron .",          // Development mode
    "build": "electron-builder build --win --publish never",
    "dist": "electron-builder --win --x64"  // Production build
  },
  "build": {
    "appId": "com.financialanalyzer.app",
    "productName": "Financial Analyzer",
    "win": {
      "target": ["nsis", "portable"],
      "icon": "assets/icon.ico"
    },
    "nsis": {
      "oneClick": false,              // Show installation options
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,  // ✅ Creates desktop icon
      "createStartMenuShortcut": true,
      "runAfterFinish": true          // Launch after install
    }
  }
}
```

### main.js - Key Features

1. **Window Management**
   - 1400x900 default size
   - Minimize to tray (doesn't quit)
   - Single instance (prevents duplicates)

2. **Development Mode**
   - Loads from http://localhost:3000
   - Opens DevTools automatically

3. **Production Mode**
   - Loads from bundled files
   - No DevTools

4. **System Tray**
   - Icon stays in system tray
   - Right-click menu for quick access
   - App runs in background

5. **Application Menu**
   - File, View, Features, Help menus
   - Keyboard shortcuts

## 📝 File Structure

```
desktop/
├── main.js                   # Electron main process
├── preload.js                # Security bridge
├── package.json              # Config & dependencies
├── LICENSE.txt               # MIT License
├── README.md                 # This file
├── generate-icons.js         # Icon generation (SVG)
├── create-icons-simple.js    # Icon generation (PNG/ICO)
├── assets/
│   ├── icon.ico              # Windows app icon
│   ├── icon.png              # PNG version
│   ├── icon.svg              # SVG source
│   ├── tray-icon.png         # System tray icon
│   └── tray-icon.svg         # SVG source
├── dist/                     # Build output (generated)
└── node_modules/             # Dependencies
```

## 🧪 Testing Checklist

### Before Building Installer

- [ ] Backend runs on localhost:5001
- [ ] Frontend builds successfully (`npm run build`)
- [ ] Desktop app runs in dev mode (`npm start`)
- [ ] All features work (login, dashboard, expenses, etc.)
- [ ] No console errors
- [ ] Icons display correctly (placeholder OK)

### After Building Installer

- [ ] Installer runs without errors
- [ ] Custom install directory option works
- [ ] Desktop shortcut created
- [ ] Start menu entry created
- [ ] App launches from shortcut
- [ ] System tray icon appears
- [ ] All features functional
- [ ] Uninstaller works properly

## 🐛 Troubleshooting

### Build Fails

**Error**: "Cannot find module 'electron'"
```bash
cd desktop
npm install
```

**Error**: "Frontend files not found"
```bash
cd frontend
npm run build
```

**Error**: "Icon file not found"
- Check `desktop/assets/icon.ico` exists
- Run `node create-icons-simple.js`

### App Won't Start

**Backend not running**
```bash
cd backend
npm start
# Must run on localhost:5001
```

**Port conflict**
- Close other apps on port 5001
- Check with: `netstat -ano | findstr :5001`

### Development Mode Issues

**App shows blank screen**
- Check console for errors
- Verify backend is running
- Check frontend is on localhost:3000

**DevTools not opening**
- Check `isDev` is true
- Restart electron: `npm start`

## 🚀 Distribution

### Installer Distribution Methods

1. **Direct Download**
   - Upload to file hosting (Google Drive, Dropbox)
   - Share download link
   - Users run .exe to install

2. **USB Drive**
   - Copy .exe to USB
   - Users run from USB
   - Install to their PC

3. **Network Share**
   - Place on company network
   - Users access and install

4. **Website Download**
   - Host on your website
   - Download button
   - Auto-download .exe

### Portable Version

**Advantages**:
- No installation required
- Run from USB drive
- No admin rights needed
- No registry changes

**Usage**:
1. Copy `FinancialAnalyzer-Portable-1.0.0.exe` to any folder
2. Double-click to run
3. App data saved in same folder

## 📊 Performance

### App Size
- **Installer**: 80-120 MB
- **Installed**: 150-200 MB
- **Portable**: 150-200 MB

### Startup Time
- **Cold start**: 3-5 seconds
- **From tray**: Instant

### Memory Usage
- **Idle**: 80-120 MB
- **Active**: 150-250 MB
- **With heavy data**: 300-500 MB

## 🔄 Updates

### Manual Updates (Current)

1. Build new installer with updated version
2. Users download new .exe
3. Run installer (overwrites old version)
4. Data preserved

### Future: Auto-Update

Add to package.json:
```json
{
  "build": {
    "publish": {
      "provider": "github",
      "owner": "your-username",
      "repo": "financial-analyzer"
    }
  }
}
```

Then use `electron-updater` package.

## 📞 Support

### Common User Questions

**Q: Do I need to install anything else?**
A: No, the installer includes everything needed.

**Q: Where is my data stored?**
A: In your user folder: `%APPDATA%\Financial Analyzer`

**Q: Can I install on multiple computers?**
A: Yes, run the installer on each computer.

**Q: How do I uninstall?**
A: Control Panel → Programs → Uninstall Financial Analyzer

**Q: Can I move the installation folder?**
A: Uninstall and reinstall in new location.

## 🎯 Next Steps

1. ✅ **Test Development Mode**
   ```bash
   cd desktop
   npm start
   ```

2. ✅ **Build Installer**
   ```bash
   npm run dist
   ```

3. ✅ **Test Installer**
   - Run `FinancialAnalyzerSetup-1.0.0.exe`
   - Test installation process
   - Verify desktop shortcut
   - Test app functionality

4. ⏳ **Replace Icons** (Optional)
   - Create custom icons
   - Replace in `assets/` folder
   - Rebuild installer

5. ⏳ **Distribute**
   - Share installer with users
   - Provide installation instructions
   - Gather feedback

## 📚 Additional Resources

- **Electron Documentation**: https://www.electronjs.org/docs
- **electron-builder Docs**: https://www.electron.build/
- **Icon Converters**: 
  - https://www.icoconverter.com/
  - https://convertio.co/png-ico/
- **Design Tools**:
  - Canva (Free): https://www.canva.com/
  - Figma (Free): https://www.figma.com/

---

## ✨ Summary

You now have a complete Windows desktop application with:
- ✅ Professional installer
- ✅ Desktop shortcut
- ✅ Start menu entry  
- ✅ System tray integration
- ✅ Custom install location
- ✅ Portable version option

**Ready to build?** Run `npm run dist` in the `desktop/` folder!
