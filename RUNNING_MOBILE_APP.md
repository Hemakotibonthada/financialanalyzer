# 📱 Running the Mobile App - Step by Step Guide

## Quick Start (Recommended Method)

### Step 1: Start Backend
```powershell
# Terminal 1
cd backend
npm start
```

Wait until you see: `Server running on http://localhost:5001`

### Step 2: Start Metro Bundler
```powershell
# Terminal 2 (new PowerShell window)
cd mobile
npx react-native start
```

Wait until you see the Metro bundler ASCII art and "Welcome to Metro"

### Step 3: Start Android Emulator

**Option A: Using Android Studio**
1. Open Android Studio
2. Click **Tools** → **Device Manager**
3. Click ▶️ (Play button) on any emulator
4. Wait for emulator to fully boot (can take 1-2 minutes)

**Option B: Command Line**
```powershell
# List available emulators
emulator -list-avds

# Start an emulator (replace with your emulator name)
emulator -avd Pixel_5_API_33
```

### Step 4: Verify Device Connection
```powershell
# Terminal 3 (new PowerShell window)
adb devices
```

You should see something like:
```
List of devices attached
emulator-5554   device
```

### Step 5: Build and Install App
```powershell
# In Terminal 3 (same as Step 4)
cd mobile
npx react-native run-android --no-packager
```

This will:
- ✅ Build the Android APK
- ✅ Install it on your emulator/device
- ✅ Launch the app automatically

---

## Alternative: Using Automated Script

We've created a helper script that does all checks:

```powershell
# Make sure Metro bundler is running first in another terminal:
cd mobile
npx react-native start

# Then in a new terminal:
.\run-android.ps1
```

---

## Troubleshooting

### Error: "Cannot start server in new window"
**Solution:** Start Metro bundler manually first
```powershell
cd mobile
npx react-native start
```

Then in another terminal:
```powershell
cd mobile
npx react-native run-android --no-packager
```

---

### Error: "No devices found"
**Solution:** Start Android emulator or connect device

**Check device connection:**
```powershell
adb devices
```

**Start emulator from command line:**
```powershell
# List available
emulator -list-avds

# Start one
emulator -avd YOUR_EMULATOR_NAME
```

---

### Error: "Could not connect to development server"
**Solutions:**

1. **Check Metro bundler is running** (Terminal should show "Welcome to Metro")

2. **Enable port forwarding for physical device:**
```powershell
adb reverse tcp:8081 tcp:8081
adb reverse tcp:5001 tcp:5001
```

3. **For emulator**, ports are automatically forwarded

4. **Reload app:**
   - Press `R` twice on your keyboard
   - Or shake device → "Reload"

---

### Error: "Unable to connect to backend API"

**Check backend is running:**
```powershell
curl http://localhost:5001/api/auth/health
```

Should return: `{"status":"healthy"}`

**For Android Emulator:**
- API URL should be: `http://10.0.2.2:5001/api` ✅ (already configured)

**For Physical Device:**
1. Find your computer's IP:
```powershell
ipconfig
# Look for IPv4 Address (e.g., 192.168.1.100)
```

2. Update `mobile/src/services/api.js`:
```javascript
const API_URL = __DEV__ 
  ? 'http://YOUR_IP:5001/api' // Replace YOUR_IP
  : 'https://your-production-api.com/api';
```

3. Allow firewall:
```powershell
# Run as Administrator
netsh advfirewall firewall add rule name="Backend API" dir=in action=allow protocol=TCP localport=5001
```

---

### Build Fails / Gradle Errors

**Clean and rebuild:**
```powershell
cd mobile/android
./gradlew clean
cd ../..
npx react-native run-android --no-packager
```

**Or more aggressive clean:**
```powershell
cd mobile
rm -rf android/app/build
rm -rf android/build
rm -rf node_modules
npm install
npx react-native run-android --no-packager
```

---

### Metro Bundler Issues

**Reset cache:**
```powershell
cd mobile
npx react-native start --reset-cache
```

**Kill existing Metro:**
```powershell
# Find and kill process on port 8081
npx kill-port 8081

# Then start fresh
npx react-native start
```

---

## Physical Device Setup

### Android Phone/Tablet

1. **Enable Developer Options:**
   - Go to Settings → About Phone
   - Tap "Build Number" 7 times
   - Go back → System → Developer Options

2. **Enable USB Debugging:**
   - In Developer Options
   - Enable "USB Debugging"

3. **Connect USB Cable**

4. **Authorize Computer:**
   - Phone will show "Allow USB debugging?" popup
   - Tap "Always allow" → OK

5. **Verify Connection:**
```powershell
adb devices
```

6. **Setup Port Forwarding:**
```powershell
adb reverse tcp:8081 tcp:8081
adb reverse tcp:5001 tcp:5001
```

7. **Run App:**
```powershell
cd mobile
npx react-native run-android --no-packager
```

---

## Complete Workflow

### Terminal 1: Backend
```powershell
cd backend
npm start
```
✅ Keep running

### Terminal 2: Metro Bundler
```powershell
cd mobile
npx react-native start
```
✅ Keep running

### Terminal 3: Build & Install
```powershell
# Start emulator or connect device first!
adb devices

# Then build
cd mobile
npx react-native run-android --no-packager
```

### Result
- ✅ Backend running on port 5001
- ✅ Metro bundler running on port 8081
- ✅ App installed and running on device/emulator

---

## App Features to Test

Once the app is running:

1. **Register New Account**
   - Tap "Create New Account"
   - Fill in details
   - Note: DOB format is DD/MM/YYYY

2. **Login**
   - Use registered credentials
   - JWT token stored automatically

3. **Dashboard**
   - View financial health score
   - See expense breakdown charts

4. **Company Expenses**
   - Tap FAB (+) button
   - Add expense details
   - View in list

5. **Lender Dashboard**
   - Track loans given
   - Add repayments
   - View progress

6. **EMI Tracker**
   - Add EMI details
   - Track payments

7. **Bill Reminders**
   - Add recurring bills
   - Set reminders

---

## Performance Tips

- **First build is slow** (5-10 minutes) - subsequent builds are faster
- **Keep Metro bundler running** - faster reloads
- **Use `--no-packager` flag** - when Metro already running
- **Hot reload** - Press `R` twice for fast refresh

---

## Still Having Issues?

1. **Check all terminals are running:**
   - Backend (port 5001)
   - Metro (port 8081)

2. **Restart everything:**
```powershell
# Stop all terminals (Ctrl+C)
# Kill ports
npx kill-port 8081
npx kill-port 5001

# Start fresh
# Terminal 1: cd backend && npm start
# Terminal 2: cd mobile && npx react-native start
# Terminal 3: cd mobile && npx react-native run-android --no-packager
```

3. **Check logs:**
```powershell
# Android logs
adb logcat | findstr "ReactNative"
```

4. **Reinstall app:**
```powershell
# Uninstall from device
adb uninstall com.financialanalyzermobile

# Reinstall
cd mobile
npx react-native run-android --no-packager
```

---

## Success Indicators

✅ Backend terminal shows API requests  
✅ Metro shows "Bundling complete"  
✅ App opens on device/emulator  
✅ You can register/login  
✅ Dashboard loads with data  

---

## Next Steps

Once app is running:
- Explore all features
- Test CRUD operations
- Check network connectivity
- Test on physical device
- Ready for development! 🎉

---

**Need more help?** Check:
- `BUILD_GUIDE.md` - Detailed builds
- `README_MOBILE.md` - Full documentation
- `MOBILE_QUICK_REFERENCE.md` - Command reference
