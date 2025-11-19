# Financial Analyzer Mobile - Quick Start Guide

## 🎯 Get Started in 5 Minutes

### Step 1: Start the Backend
```bash
# Terminal 1 - Start MongoDB
cd backend
npm run start:mongodb

# Terminal 2 - Start Backend Server
cd backend
npm start
```

### Step 2: Configure Mobile App

Open `mobile/src/services/api.js` and update:

```javascript
// For Android Emulator
const API_BASE_URL = 'http://10.0.2.2:5001/api';

// For iOS Simulator
const API_BASE_URL = 'http://localhost:5001/api';

// For Physical Device (replace with your IP)
const API_BASE_URL = 'http://192.168.1.XXX:5001/api';
```

**To find your IP:**
- Windows: Run `ipconfig` in CMD
- macOS/Linux: Run `ifconfig` in Terminal
- Look for IPv4 Address (e.g., 192.168.1.100)

### Step 3: Install Dependencies
```bash
cd mobile
npm install
```

### Step 4: Platform Setup

#### Android (Windows/macOS/Linux)
```bash
# No additional setup needed
npm run android
```

#### iOS (macOS only)
```bash
cd ios
pod install
cd ..
npm run ios
```

#### Windows (Windows only)
```bash
npx react-native-windows-init --overwrite
npx react-native run-windows
```

### Step 5: Run the App
```bash
# Android
npm run android

# iOS
npm run ios

# Windows
npx react-native run-windows
```

## 📱 First Time Setup

### 1. Create Account
- Open app on your device/simulator
- Tap "Create New Account"
- Fill in details:
  - Username
  - Email
  - Password
  - DOB (for password generation)
  - Phone (optional)
- Tap "Register"

### 2. Login
- Enter registered email and password
- Tap "Login"

### 3. Explore Features

#### Dashboard
- View financial health score
- See expense breakdown
- Access insights and recommendations

#### Company Expenses
- Tap FAB (+) button to add expense
- Fill in expense details
- View analytics cards
- Search and filter expenses

#### EMI Tracker
- Add EMI details
- Track payment schedules
- View upcoming payments

#### Lender Dashboard
- Add loans given to others
- Record repayments
- Track loan status

#### Bill Reminders
- Add recurring bills
- Set reminders
- Mark as paid

## 🔧 Network Troubleshooting

### Cannot Connect to Backend

**1. Check Backend is Running:**
```bash
curl http://localhost:5001/api/auth/health
# Should return: {"status":"ok"}
```

**2. For Physical Devices:**

Allow backend access on your network:

**Windows PowerShell (Run as Administrator):**
```powershell
# Allow inbound on port 5001
netsh advfirewall firewall add rule name="Backend API" dir=in action=allow protocol=TCP localport=5001

# Or temporarily disable firewall for testing
Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled False
```

**macOS Terminal:**
```bash
# Allow Node through firewall (one-time popup)
sudo codesign --force --deep --sign - /usr/local/bin/node
```

**3. Update Backend to Allow Network Access:**

Edit `backend/server.js`:
```javascript
const PORT = process.env.PORT || 5001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
```

**4. Test Network Connection:**

On your phone/device browser, visit:
```
http://YOUR_COMPUTER_IP:5001/api/auth/health
```

Should see: `{"status":"ok"}`

## 🐛 Common Issues

### Issue: "Metro Bundler already running"
```bash
# Kill existing process
npx react-native start --reset-cache
```

### Issue: "Unable to resolve module"
```bash
# Clear cache and reinstall
rm -rf node_modules
npm install
npx react-native start --reset-cache
```

### Issue: Android app crashes on startup
```bash
# Clean and rebuild
cd android
./gradlew clean
cd ..
npm run android
```

### Issue: iOS build fails
```bash
# Clean pods
cd ios
rm -rf Pods Podfile.lock
pod install
pod update
cd ..
npm run ios
```

### Issue: Can't see data after login
- Check backend console for errors
- Verify API_BASE_URL is correct
- Check network connection
- Try logging out and back in

## 📊 Features Overview

### ✅ Currently Available
- ✅ User Authentication (Login/Register)
- ✅ Financial Health Dashboard
- ✅ Company Expenses Management
- ✅ EMI Tracking
- ✅ Lender Dashboard (Loans Given)
- ✅ Bill Reminders
- ✅ Charts & Analytics
- ✅ Search & Filters
- ✅ Pull to Refresh

### 🔜 Coming Soon
- 📌 Push Notifications
- 📄 PDF/Excel Export from Mobile
- 🔐 Biometric Authentication
- 📴 Offline Mode
- 🔄 Auto-sync
- 📷 Receipt Photo Capture

## 🎨 Customization

### Change Theme Colors
Edit `mobile/src/theme.js`:
```javascript
export const theme = {
  colors: {
    primary: '#4F46E5',    // Your brand color
    secondary: '#10B981',  // Secondary color
    // ... more colors
  }
};
```

### Change App Name
1. **Android**: Edit `android/app/src/main/res/values/strings.xml`
2. **iOS**: Edit `ios/FinancialAnalyzer/Info.plist`
3. **package.json**: Update `"name"` field

## 📦 Building Release Version

### Android APK
```bash
cd mobile/android
./gradlew assembleRelease

# APK location:
# android/app/build/outputs/apk/release/app-release.apk
```

### Install APK on Device
```bash
adb install android/app/build/outputs/apk/release/app-release.apk
```

See [BUILD_GUIDE.md](./BUILD_GUIDE.md) for iOS and Windows builds.

## 🔐 Security Notes

- All API calls use JWT authentication
- Passwords are hashed on backend
- Documents are password-protected
- HTTPS recommended for production
- Tokens stored securely in AsyncStorage

## 📱 Supported Platforms

- **Android**: 6.0+ (API Level 23+)
- **iOS**: 13.0+
- **Windows**: Windows 10 (Build 19041+)

## 🚀 Performance Tips

1. **Use Release Build for Testing:**
   - Debug builds are slower
   - Test production performance with release builds

2. **Optimize Images:**
   - Use compressed images
   - Proper image dimensions

3. **Enable Hermes (Already Configured):**
   - Faster startup time
   - Reduced memory usage

## 📞 Need Help?

1. Check error logs:
   - Android: `adb logcat`
   - iOS: Xcode console
   - Metro: Terminal output

2. Review documentation:
   - README_MOBILE.md
   - BUILD_GUIDE.md

3. Common solutions:
   - Restart Metro bundler
   - Clean build
   - Reinstall dependencies

## ✅ Pre-Launch Checklist

- [ ] Backend running on port 5001
- [ ] MongoDB running
- [ ] Mobile dependencies installed
- [ ] API_BASE_URL configured correctly
- [ ] Network firewall configured
- [ ] Test user account created
- [ ] All features tested

## 🎉 You're Ready!

Your Financial Analyzer Mobile App is ready to use!

**Default Test Login (if needed):**
- Create your own account via Register screen
- Or use existing web app credentials

**Start Tracking Your Finances! 💰**

---

**Need more help?** Check the full [BUILD_GUIDE.md](./BUILD_GUIDE.md)
