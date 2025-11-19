# 🚀 Financial Analyzer Mobile - Quick Reference

## 📱 Run Commands

```bash
# Android
cd mobile && npm run android

# iOS
cd mobile && npm run ios

# Windows
cd mobile && npx react-native run-windows
```

## 🔧 Setup Commands

```bash
# Install dependencies
cd mobile && npm install

# iOS only (macOS)
cd mobile/ios && pod install && cd ../..

# Windows only
cd mobile && npx react-native-windows-init --overwrite
```

## 🏗️ Build Commands

```bash
# Android APK
cd mobile/android && ./gradlew assembleRelease

# Android AAB (Play Store)
cd mobile/android && ./gradlew bundleRelease

# iOS (Xcode)
open mobile/ios/FinancialAnalyzer.xcworkspace
# Product -> Archive

# Windows
cd mobile && npx react-native run-windows --release
```

## 🌐 Network Setup

### Find Your IP
```bash
# Windows
ipconfig

# macOS/Linux
ifconfig | grep inet
```

### Configure API URL
Edit `mobile/src/services/api.js`:

```javascript
// Android Emulator
const API_BASE_URL = 'http://10.0.2.2:5001/api';

// iOS Simulator
const API_BASE_URL = 'http://localhost:5001/api';

// Physical Device
const API_BASE_URL = 'http://YOUR_IP:5001/api';
```

### Allow Firewall (Windows)
```powershell
# Run as Administrator
netsh advfirewall firewall add rule name="Backend API" dir=in action=allow protocol=TCP localport=5001
```

## 🐛 Troubleshooting

```bash
# Clean cache
cd mobile && npx react-native start --reset-cache

# Android clean
cd mobile/android && ./gradlew clean && cd ../..

# iOS clean
cd mobile/ios && rm -rf Pods Podfile.lock && pod install && cd ../..

# Kill port 8081
npx kill-port 8081
```

## 📂 Project Structure

```
mobile/src/
├── screens/
│   ├── Auth/              # Login, Register
│   ├── Dashboard/         # Financial Health
│   ├── CompanyExpenses/   # Expense tracking
│   ├── EMI/               # EMI tracker
│   ├── Lender/            # Loans given
│   ├── BillReminders/     # Bill reminders
│   └── Profile/           # User profile
├── navigation/            # App navigation
├── services/api.js        # API endpoints
├── context/               # React Context
└── theme.js               # Styling theme
```

## 🎯 Features

✅ Authentication (Login/Register)  
✅ Financial Health Dashboard  
✅ Company Expenses with Analytics  
✅ EMI Tracker  
✅ Lender Dashboard (Loans Given)  
✅ Bill Reminders  
✅ Charts & Visualizations  
✅ Search & Filters  
✅ Pull to Refresh  

## 📱 Supported Platforms

- **Android**: 6.0+ (API 23+)
- **iOS**: 13.0+
- **Windows**: 10 Build 19041+

## 🔐 Security

- JWT Authentication
- Secure AsyncStorage
- Password-protected exports
- HTTPS ready

## 📚 Documentation

- `README_MOBILE.md` - Overview
- `BUILD_GUIDE.md` - Detailed builds
- `QUICK_START_MOBILE.md` - 5-min setup
- `MOBILE_APP_IMPLEMENTATION_COMPLETE.md` - Summary

## ⚡ Quick Test

```bash
# 1. Start backend
cd backend && npm start

# 2. Start mobile (new terminal)
cd mobile && npm run android

# 3. Test
# - Register new account
# - Login
# - Add expense
# - View dashboard
```

## 🎨 Customize

### Change Colors
Edit `mobile/src/theme.js`:
```javascript
colors: {
  primary: '#4F46E5',
  secondary: '#10B981',
  // ...
}
```

### Change App Name
- Android: `android/app/src/main/res/values/strings.xml`
- iOS: `ios/FinancialAnalyzer/Info.plist`

## 📦 APK Location

```
mobile/android/app/build/outputs/apk/release/app-release.apk
```

## 🔄 Update Dependencies

```bash
cd mobile && npm update
```

## 🆘 Common Errors

**"Unable to load script"**
```bash
npx react-native start --reset-cache
```

**"Port 8081 already in use"**
```bash
npx kill-port 8081
```

**"Cannot connect to backend"**
- Check backend is running
- Verify API_BASE_URL
- Check firewall
- Use correct IP for physical devices

## ✅ Ready Checklist

- [ ] Backend running on 5001
- [ ] MongoDB running
- [ ] Dependencies installed
- [ ] API URL configured
- [ ] Firewall allowed
- [ ] Device/emulator running

## 🎉 Success!

Your mobile app is ready for:
- ✅ Testing
- ✅ Development
- ✅ Beta release
- ✅ Production deployment

---

**Quick Help:** All commands assume you're in the `Financial_Analyzer` directory.
