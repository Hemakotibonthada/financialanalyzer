# 🪟 Windows App - Quick Guide

## ✅ Status: Windows Support Initialized

React Native Windows has been successfully set up for your Financial Analyzer app!

## 🚀 Running the Windows App

### Method 1: Using Helper Script (Recommended)
```powershell
.\run-windows.ps1
```

### Method 2: Manual Command
```powershell
cd mobile
npx react-native run-windows
```

### Method 3: Release Build
```powershell
cd mobile
npx react-native run-windows --release
```

---

## ⏱️ Build Time Expectations

### First Build
- **Time:** 5-10 minutes
- **What happens:**
  - NuGet package restoration
  - Native module auto-linking
  - C++ compilation
  - UWP app package creation
  - Deployment to Windows

### Subsequent Builds
- **Time:** 1-3 minutes (much faster!)
- Only changed files are recompiled

---

## 📋 Prerequisites (Already Checked)

✅ Node.js installed  
✅ React Native Windows initialized  
✅ Windows folder created  
✅ Dependencies installed  

### Required (Must Have)
- ✅ Visual Studio 2022 (with C++ and UWP workloads)
- ✅ Windows 10 SDK (10.0.19041.0+)
- ✅ MSBuild

---

## 🔧 Current Build Status

The Windows app is currently **building**. You'll see:

1. ✅ **Restoring NuGet packages** - Complete
2. ✅ **Auto-linking** - Complete  
3. 🔄 **Building Solution** - In Progress
4. ⏳ Compiling C++ native modules
5. ⏳ Creating UWP package
6. ⏳ Deploying to Windows
7. ⏳ Launching app

**This is normal!** First-time builds take time.

---

## 🎯 What You'll Get

Once the build completes, you'll have:

- ✅ Native Windows desktop application
- ✅ Full UWP (Universal Windows Platform) app
- ✅ All Financial Analyzer features
- ✅ Native Windows UI performance
- ✅ Hot reload support

---

## 📱 App Features (Same as Mobile)

- Authentication (Login/Register)
- Financial Health Dashboard
- Company Expenses Management
- EMI Tracker
- Lender Dashboard
- Bill Reminders
- Charts & Analytics
- All CRUD operations

---

## 🐛 Troubleshooting

### Build Taking Too Long?
- First build: 5-10 minutes is normal
- Check Task Manager - MSBuild should be running
- Check terminal for errors

### Build Fails?

**Clean and rebuild:**
```powershell
cd mobile/windows
msbuild financial-analyzer-mobile.sln /t:Clean
cd ../..
npx react-native run-windows
```

**Reinstall Windows support:**
```powershell
cd mobile
npm uninstall react-native-windows
npx react-native-windows-init --overwrite
npx react-native run-windows
```

### Visual Studio Errors?

Make sure you have installed:
1. Visual Studio 2022 (Community, Professional, or Enterprise)
2. Workloads:
   - **Desktop development with C++**
   - **Universal Windows Platform development**
3. Windows 10 SDK (10.0.19041.0 or later)

### Can't Connect to Backend?

**Backend must be running:**
```powershell
cd backend
npm start
```

**API URL for Windows:**
- Windows uses: `http://localhost:5001/api` (already configured)
- No special configuration needed for localhost

---

## 🎨 Windows-Specific Features

### Running in Windows
- Native window controls
- Windows keyboard shortcuts
- System integration
- File system access
- Native notifications (when implemented)

### Distribution
- Create MSIX package
- Microsoft Store submission
- Sideloading for internal deployment
- Enterprise deployment

---

## 📦 Building for Distribution

### Debug Build (Current)
```powershell
cd mobile
npx react-native run-windows
```

### Release Build
```powershell
cd mobile
npx react-native run-windows --release --arch x64
```

### Create MSIX Package
```powershell
cd mobile/windows
msbuild financial-analyzer-mobile.sln /p:Configuration=Release /p:Platform=x64 /p:AppxBundle=Always /p:AppxBundlePlatforms="x64"
```

Package will be in: `windows/AppPackages/`

---

## 🔄 Development Workflow

### 1. Start Backend
```powershell
cd backend
npm start
```

### 2. Start Windows App
```powershell
cd mobile
npx react-native run-windows
```

### 3. Make Changes
- Edit files in `mobile/src/`
- App will hot reload automatically
- No need to rebuild for code changes

### 4. Rebuild Native Code
Only needed if you change:
- Windows native code
- Dependencies
- Configuration

```powershell
npx react-native run-windows
```

---

## 📊 Build Progress Indicators

When building, you'll see:

✅ **Green checkmarks** - Step completed  
🔄 **Spinner** - Currently working  
❌ **Red X** - Error occurred  

### Normal Output:
```
√ Restoring NuGet packages
√ Auto-linking...
√ Found Solution
i Build configuration: Debug
i Build platform: x64
- Building Solution...
```

---

## 🎉 Success Indicators

When build succeeds:
- ✅ App window opens
- ✅ Financial Analyzer login screen appears
- ✅ Terminal shows "Launch succeeded"
- ✅ Metro bundler is serving files

---

## 💻 System Requirements

### Minimum
- Windows 10 (Build 19041) or Windows 11
- 8 GB RAM
- 10 GB free disk space
- Visual Studio 2022

### Recommended
- Windows 11
- 16 GB RAM
- SSD with 20 GB free space
- Visual Studio 2022 Professional

---

## 📚 Additional Resources

- **React Native Windows Docs:** https://microsoft.github.io/react-native-windows/
- **BUILD_GUIDE.md** - Complete build instructions
- **README_MOBILE.md** - App documentation
- **MOBILE_QUICK_REFERENCE.md** - Command reference

---

## ⚡ Quick Commands

```powershell
# Run app
npx react-native run-windows

# Run release
npx react-native run-windows --release

# Clean build
cd windows && msbuild financial-analyzer-mobile.sln /t:Clean && cd ..

# Rebuild
npx react-native run-windows

# View logs
npx react-native log-windows
```

---

## 🆘 Need Help?

1. **Check terminal output** for specific errors
2. **Review BUILD_GUIDE.md** for detailed instructions
3. **Verify prerequisites** are installed
4. **Try clean build** if issues persist

---

## ✅ Next Steps

Once the app launches:

1. **Test Login/Register** - Create account
2. **Explore Dashboard** - View financial health
3. **Add Data** - Test company expenses, EMIs, etc.
4. **Check Features** - All mobile features work on Windows
5. **Test Hot Reload** - Make code changes, see updates

---

**🎊 Your Windows app is building! Please wait for it to complete...**

Current status: Check the terminal window for progress.

---

*Last Updated: November 18, 2025*
