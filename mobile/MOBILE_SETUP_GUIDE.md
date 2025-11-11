# Financial Analyzer - Mobile App Setup Guide

## 🚀 Overview

This guide will help you build and run the Financial Analyzer mobile app for **Android** and **iOS** platforms.

---

## 📋 Prerequisites

### Required Software

#### For Both Platforms:
- **Node.js**: v18 or higher
- **npm** or **yarn**: Latest version
- **React Native CLI**: `npm install -g react-native-cli`
- **Git**: For version control

#### For Android:
- **Android Studio**: Latest version (includes Android SDK)
- **Java Development Kit (JDK)**: Version 11 or 17
- **Android SDK**: API Level 31 or higher
- **Android Emulator** or **Physical Device**

#### For iOS (macOS only):
- **Xcode**: Latest version (14+)
- **CocoaPods**: `sudo gem install cocoapods`
- **iOS Simulator** or **Physical Device**
- **Apple Developer Account** (for physical device testing)

---

## 🛠️ Initial Setup

### Step 1: Navigate to Mobile Directory

```bash
cd mobile
```

### Step 2: Install Dependencies

```bash
npm install
# or
yarn install
```

### Step 3: Configure API URL

Open `mobile/src/services/api.js` and update the `API_URL`:

```javascript
// For Android Emulator
const API_URL = 'http://10.0.2.2:5001/api';

// For iOS Simulator
const API_URL = 'http://localhost:5001/api';

// For Physical Devices (replace with your computer's IP)
const API_URL = 'http://192.168.x.x:5001/api';
```

**To find your computer's IP:**

**Windows:**
```powershell
ipconfig
```
Look for "IPv4 Address" under your network adapter.

**macOS/Linux:**
```bash
ifconfig
```
Look for "inet" address.

---

## 📱 Android Setup & Build

### Step 1: Set Up Android Studio

1. Download and install [Android Studio](https://developer.android.com/studio)
2. Open Android Studio → SDK Manager
3. Install:
   - Android SDK Platform 31 (or higher)
   - Android SDK Build-Tools
   - Android Emulator

### Step 2: Set Environment Variables

**Windows (PowerShell):**
```powershell
$env:ANDROID_HOME = "C:\Users\YourUsername\AppData\Local\Android\Sdk"
$env:Path += ";$env:ANDROID_HOME\platform-tools"
$env:Path += ";$env:ANDROID_HOME\tools"
```

**macOS/Linux:**
```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

Add to `~/.bash_profile` or `~/.zshrc` for persistence.

### Step 3: Create Android Project Files

Create `mobile/android/app/build.gradle`:

```gradle
apply plugin: "com.android.application"
apply plugin: "com.facebook.react"

react {
    /* Folders */
    root = file("../../")
    reactNativeDir = file("../../node_modules/react-native")
    codegenDir = file("../../node_modules/@react-native/codegen")
}

android {
    namespace "com.financialanalyzer"
    compileSdkVersion 34

    defaultConfig {
        applicationId "com.financialanalyzer"
        minSdkVersion 23
        targetSdkVersion 34
        versionCode 1
        versionName "1.0.0"
    }

    signingConfigs {
        release {
            if (project.hasProperty('MYAPP_UPLOAD_STORE_FILE')) {
                storeFile file(MYAPP_UPLOAD_STORE_FILE)
                storePassword MYAPP_UPLOAD_STORE_PASSWORD
                keyAlias MYAPP_UPLOAD_KEY_ALIAS
                keyPassword MYAPP_UPLOAD_KEY_PASSWORD
            }
        }
    }

    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            proguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro"
        }
    }
}

dependencies {
    implementation("com.facebook.react:react-android")

    if (hermesEnabled.toBoolean()) {
        implementation("com.facebook.react:hermes-android")
    } else {
        implementation jscFlavor
    }
}
```

### Step 4: Run on Android

**Start Metro Bundler:**
```bash
npm start
```

**In another terminal, run Android:**
```bash
npm run android
# or
react-native run-android
```

### Step 5: Build APK for Distribution

```bash
cd android
./gradlew assembleRelease
```

APK location: `android/app/build/outputs/apk/release/app-release.apk`

---

## 🍎 iOS Setup & Build (macOS Only)

### Step 1: Install Xcode

1. Download Xcode from the [Mac App Store](https://apps.apple.com/us/app/xcode/id497799835)
2. Install Command Line Tools:
```bash
xcode-select --install
```

### Step 2: Install CocoaPods

```bash
sudo gem install cocoapods
```

### Step 3: Install iOS Dependencies

```bash
cd mobile/ios
pod install
cd ..
```

### Step 4: Run on iOS

**Start Metro Bundler:**
```bash
npm start
```

**In another terminal, run iOS:**
```bash
npm run ios
# or
react-native run-ios
```

**Run on specific simulator:**
```bash
react-native run-ios --simulator="iPhone 15"
```

### Step 5: Build for Distribution

1. Open `mobile/ios/FinancialAnalyzer.xcworkspace` in Xcode
2. Select **Product** → **Archive**
3. Once archived, click **Distribute App**
4. Choose distribution method (App Store, Ad Hoc, Enterprise)
5. Follow the wizard to create IPA file

---

## 🔧 Configuration Files

### Android Manifest

Create `mobile/android/app/src/main/AndroidManifest.xml`:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.USE_BIOMETRIC" />
    <uses-permission android:name="android.permission.USE_FINGERPRINT" />

    <application
        android:name=".MainApplication"
        android:label="@string/app_name"
        android:icon="@mipmap/ic_launcher"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:allowBackup="false"
        android:theme="@style/AppTheme"
        android:usesCleartextTraffic="true">
        <activity
            android:name=".MainActivity"
            android:label="@string/app_name"
            android:configChanges="keyboard|keyboardHidden|orientation|screenLayout|screenSize|smallestScreenSize|uiMode"
            android:launchMode="singleTask"
            android:windowSoftInputMode="adjustResize"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
```

### iOS Info.plist

Key additions for `mobile/ios/FinancialAnalyzer/Info.plist`:

```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <true/>
</dict>
<key>NSFaceIDUsageDescription</key>
<string>Use Face ID to authenticate</string>
<key>NSCameraUsageDescription</key>
<string>Take photos for document scanning</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>Select photos for document upload</string>
```

---

## 🔐 Backend Configuration

### Ensure Backend is Running

```bash
cd backend
npm run dev
```

The backend should be running on `http://localhost:5001`

### Allow Network Access

**Windows Firewall:**
```powershell
netsh advfirewall firewall add rule name="Node.js Backend" dir=in action=allow protocol=TCP localport=5001
```

**macOS Firewall:**
System Preferences → Security & Privacy → Firewall → Firewall Options → Add Node application

---

## 📲 Testing on Physical Devices

### Android Physical Device

1. **Enable Developer Options:**
   - Go to Settings → About Phone
   - Tap "Build Number" 7 times
   
2. **Enable USB Debugging:**
   - Settings → Developer Options → USB Debugging

3. **Connect Device:**
   - Connect via USB
   - Run: `adb devices` to verify connection
   - Run: `npm run android`

4. **Update API URL:**
   - Use your computer's local IP (not localhost)
   - Example: `http://192.168.1.100:5001/api`

### iOS Physical Device

1. **Connect iPhone/iPad** via USB

2. **Open Xcode:**
   - Open `mobile/ios/FinancialAnalyzer.xcworkspace`
   
3. **Select Device:**
   - Top menu → Select your connected device

4. **Configure Signing:**
   - Select project → Signing & Capabilities
   - Add your Apple Developer Team
   
5. **Build & Run:**
   - Click Play button or Cmd+R

---

## 🎨 Customization

### App Icon

**Android:**
- Place icons in: `android/app/src/main/res/mipmap-*/ic_launcher.png`
- Sizes: mdpi (48x48), hdpi (72x72), xhdpi (96x96), xxhdpi (144x144), xxxhdpi (192x192)

**iOS:**
- Open `ios/FinancialAnalyzer.xcworkspace` in Xcode
- Select Assets.xcassets → AppIcon
- Drag and drop images for all required sizes

### Splash Screen

Use [react-native-splash-screen](https://github.com/crazycodeboy/react-native-splash-screen) for custom splash screens.

### App Name

**Android:** `android/app/src/main/res/values/strings.xml`
```xml
<string name="app_name">Financial Analyzer</string>
```

**iOS:** In Xcode, select project → General → Display Name

---

## 🚀 Building for Production

### Android (Release APK)

```bash
cd android
./gradlew assembleRelease
```

**Generate Signed APK:**

1. Generate keystore:
```bash
keytool -genkeypair -v -storetype PKCS12 -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

2. Create `android/gradle.properties`:
```properties
MYAPP_UPLOAD_STORE_FILE=my-release-key.keystore
MYAPP_UPLOAD_KEY_ALIAS=my-key-alias
MYAPP_UPLOAD_STORE_PASSWORD=****
MYAPP_UPLOAD_KEY_PASSWORD=****
```

3. Build:
```bash
./gradlew assembleRelease
```

### iOS (App Store)

1. Open Xcode
2. Select **Generic iOS Device**
3. Product → Archive
4. Upload to App Store Connect

---

## 🐛 Troubleshooting

### Common Issues

**1. Metro Bundler Won't Start**
```bash
npx react-native start --reset-cache
```

**2. Android Build Failed**
```bash
cd android
./gradlew clean
cd ..
npx react-native run-android
```

**3. iOS Pod Install Failed**
```bash
cd ios
pod deintegrate
pod install
cd ..
```

**4. Network Request Failed**
- Check API_URL in `src/services/api.js`
- Verify backend is running
- Check firewall settings
- Use computer's IP address, not localhost (for physical devices)

**5. Port Already in Use**
```bash
# Kill process on port 8081 (Metro Bundler)
# Windows
netstat -ano | findstr :8081
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:8081 | xargs kill
```

---

## 📦 Dependencies Summary

### Core Dependencies
- `react-native`: ^0.73.2
- `react`: 18.2.0
- `@react-navigation/native`: ^6.1.9
- `react-native-paper`: ^5.12.3

### Navigation
- `@react-navigation/native-stack`: ^6.9.17
- `@react-navigation/bottom-tabs`: ^6.5.11
- `react-native-screens`: ^3.29.0
- `react-native-safe-area-context`: ^4.8.2

### API & Storage
- `axios`: ^1.6.2
- `@react-native-async-storage/async-storage`: ^1.21.0
- `socket.io-client`: ^4.6.1

### UI Components
- `react-native-vector-icons`: ^10.0.3
- `react-native-linear-gradient`: ^2.8.3
- `react-native-chart-kit`: ^6.12.0
- `react-native-svg`: ^14.1.0

### Utilities
- `date-fns`: ^2.30.0
- `lodash`: ^4.17.21

---

## 📊 App Features

### Implemented Screens
✅ **Authentication**
- Login Screen
- Register Screen

✅ **Dashboard**
- Financial Overview
- Quick Stats
- Recent Transactions
- Quick Actions

✅ **EMI Tracker**
- EMI List
- Status Filtering
- Payment Progress

✅ **Bill Reminders**
- Bill Dashboard
- Category-based Cards
- Approval Workflow

✅ **Investments**
- Portfolio Summary
- Investment List
- Gain/Loss Tracking

✅ **Profile**
- User Information
- Settings & Preferences
- Logout

---

## 🔜 Future Enhancements

### Planned Features
- [ ] Push Notifications
- [ ] Biometric Authentication
- [ ] Document Scanner (OCR)
- [ ] Offline Mode
- [ ] Data Sync
- [ ] Charts & Graphs
- [ ] Budget Tracking
- [ ] Goals Management
- [ ] Net Worth Tracker
- [ ] Export Reports

---

## 📝 Testing Checklist

### Before Release
- [ ] Test on Android Emulator
- [ ] Test on iOS Simulator
- [ ] Test on Android Physical Device
- [ ] Test on iOS Physical Device
- [ ] Test all API endpoints
- [ ] Test offline behavior
- [ ] Test authentication flow
- [ ] Test navigation
- [ ] Test form validations
- [ ] Check app icons
- [ ] Check splash screen
- [ ] Test on different screen sizes
- [ ] Performance testing
- [ ] Memory leak testing

---

## 📞 Support

### Resources
- **React Native Docs**: https://reactnative.dev/docs/getting-started
- **React Navigation**: https://reactnavigation.org/
- **React Native Paper**: https://callstack.github.io/react-native-paper/

### Common Commands

```bash
# Start Metro Bundler
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios

# Clean build
npm run clean:android
npm run clean:ios

# Build release APK
npm run build:android

# Run tests
npm test

# Lint code
npm run lint
```

---

## ✅ Success Criteria

Your app is ready when:
1. ✅ App builds without errors
2. ✅ All screens load correctly
3. ✅ API calls work properly
4. ✅ Authentication works
5. ✅ Navigation is smooth
6. ✅ No console errors
7. ✅ App icon displays correctly
8. ✅ Works on both platforms

---

**Congratulations! You now have a fully functional Financial Analyzer mobile app! 🎉**

---

*Last Updated: November 11, 2025*
*Version: 1.0.0*
