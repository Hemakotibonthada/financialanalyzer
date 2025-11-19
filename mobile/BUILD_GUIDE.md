# Financial Analyzer Mobile App - Build & Deployment Guide

## 📱 Platforms Supported
- **Android** (APK/AAB)
- **iOS** (IPA)
- **Windows** (MSIX) - via React Native Windows

## 🔧 Prerequisites

### All Platforms
- Node.js >= 18
- npm >= 9
- Git

### Android
- Android Studio (latest version)
- Android SDK (API Level 33+)
- Java Development Kit (JDK) 17
- Android Emulator or Physical Device

### iOS (macOS only)
- Xcode 15+
- CocoaPods (`sudo gem install cocoapods`)
- iOS Simulator or Physical Device
- Apple Developer Account (for physical devices)

### Windows
- Windows 10 SDK (10.0.19041.0+)
- Visual Studio 2022 with:
  - Desktop development with C++
  - Universal Windows Platform development

## 📦 Installation & Setup

### 1. Clone and Install Dependencies

```bash
cd mobile
npm install
```

### 2. Configure Backend URL

Edit `src/services/api.js` and update the API_BASE_URL:

```javascript
// For Android Emulator
const API_BASE_URL = 'http://10.0.2.2:5001/api';

// For iOS Simulator
const API_BASE_URL = 'http://localhost:5001/api';

// For Physical Devices (replace with your computer's IP)
const API_BASE_URL = 'http://192.168.1.100:5001/api';
```

### 3. Platform-Specific Setup

#### Android Setup

```bash
# Link Android project
npx react-native link

# Open Android Studio
cd android
./gradlew clean
cd ..
```

#### iOS Setup (macOS only)

```bash
# Install iOS dependencies
cd ios
pod install
cd ..
```

#### Windows Setup

```bash
# Install React Native Windows
npx react-native-windows-init --overwrite

# Install Windows dependencies
cd windows
npm install
```

## 🚀 Running the App

### Development Mode

#### Android
```bash
# Start Metro bundler
npm start

# In another terminal, run Android
npm run android

# Or use Android Studio:
# Open android/ folder in Android Studio
# Click "Run" button
```

#### iOS
```bash
# Start Metro bundler
npm start

# In another terminal, run iOS
npm run ios

# Or use Xcode:
# Open ios/FinancialAnalyzer.xcworkspace in Xcode
# Select target device/simulator
# Click "Run" button
```

#### Windows
```bash
# Start Metro bundler
npm start

# In another terminal, run Windows
npx react-native run-windows
```

## 📦 Building Release APK/IPA

### Android Release Build

#### Generate Signing Key
```bash
cd android/app

# Generate keystore
keytool -genkeypair -v -storetype PKCS12 -keystore financial-analyzer-release-key.keystore -alias financial-analyzer-key-alias -keyalg RSA -keysize 2048 -validity 10000

# Move keystore to android/app directory
```

#### Configure Gradle Signing

Edit `android/gradle.properties`:
```properties
MYAPP_RELEASE_STORE_FILE=financial-analyzer-release-key.keystore
MYAPP_RELEASE_KEY_ALIAS=financial-analyzer-key-alias
MYAPP_RELEASE_STORE_PASSWORD=YOUR_KEYSTORE_PASSWORD
MYAPP_RELEASE_KEY_PASSWORD=YOUR_KEY_PASSWORD
```

Edit `android/app/build.gradle`:
```gradle
android {
    ...
    signingConfigs {
        release {
            if (project.hasProperty('MYAPP_RELEASE_STORE_FILE')) {
                storeFile file(MYAPP_RELEASE_STORE_FILE)
                storePassword MYAPP_RELEASE_STORE_PASSWORD
                keyAlias MYAPP_RELEASE_KEY_ALIAS
                keyPassword MYAPP_RELEASE_KEY_PASSWORD
            }
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

#### Build APK
```bash
cd android
./gradlew assembleRelease

# APK will be at: android/app/build/outputs/apk/release/app-release.apk
```

#### Build AAB (for Play Store)
```bash
cd android
./gradlew bundleRelease

# AAB will be at: android/app/build/outputs/bundle/release/app-release.aab
```

### iOS Release Build (macOS only)

#### Configure Xcode Project
1. Open `ios/FinancialAnalyzer.xcworkspace` in Xcode
2. Select "FinancialAnalyzer" target
3. Go to "Signing & Capabilities"
4. Select your Team
5. Choose appropriate Bundle Identifier

#### Archive for Distribution
```bash
# Clean build folder
rm -rf ios/build

# Archive (via Xcode)
# Product -> Archive
# Once archived, click "Distribute App"
# Choose distribution method:
#   - App Store Connect (for App Store)
#   - Ad Hoc (for testing)
#   - Enterprise (for internal distribution)

# Or via command line:
cd ios
xcodebuild -workspace FinancialAnalyzer.xcworkspace \
  -scheme FinancialAnalyzer \
  -configuration Release \
  -archivePath build/FinancialAnalyzer.xcarchive \
  archive

# Export IPA
xcodebuild -exportArchive \
  -archivePath build/FinancialAnalyzer.xcarchive \
  -exportPath build \
  -exportOptionsPlist exportOptions.plist
```

### Windows Release Build

```bash
# Build Release
npx react-native run-windows --release

# Create MSIX package
cd windows/FinancialAnalyzer/AppPackages

# Or use Visual Studio:
# Open windows/FinancialAnalyzer.sln in Visual Studio
# Project -> Store -> Create App Packages
# Follow the wizard
```

## 🧪 Testing Builds

### Android
```bash
# Install APK on device
adb install android/app/build/outputs/apk/release/app-release.apk

# Or drag & drop APK to emulator
```

### iOS
```bash
# Install on Simulator
xcrun simctl install booted path/to/app.app

# Install on Physical Device (via Xcode)
# Window -> Devices and Simulators
# Select device -> Add app file
```

### Windows
```bash
# Install MSIX
# Double-click the MSIX file
# Or use PowerShell:
Add-AppxPackage -Path "path\to\package.msix"
```

## 📝 Build Configuration

### App Version & Build Number

Edit version in `package.json`:
```json
{
  "version": "1.0.0"
}
```

#### Android
Edit `android/app/build.gradle`:
```gradle
android {
    defaultConfig {
        versionCode 1
        versionName "1.0.0"
    }
}
```

#### iOS
Edit `ios/FinancialAnalyzer/Info.plist`:
```xml
<key>CFBundleShortVersionString</key>
<string>1.0.0</string>
<key>CFBundleVersion</key>
<string>1</string>
```

### App Icons & Splash Screen

#### Android
- Replace icons in `android/app/src/main/res/mipmap-*` folders
- Splash screen: `android/app/src/main/res/drawable/launch_screen.png`

#### iOS
- Use Xcode: Select `Images.xcassets` -> Replace icons
- Splash screen: `ios/FinancialAnalyzer/Images.xcassets/LaunchImage`

## 🚢 Distribution

### Google Play Store (Android)
1. Create Google Play Console account ($25 one-time fee)
2. Create new application
3. Upload AAB file
4. Complete store listing
5. Submit for review

### Apple App Store (iOS)
1. Enroll in Apple Developer Program ($99/year)
2. Create App Store Connect account
3. Create new app
4. Upload IPA via Xcode or Transporter
5. Complete app information
6. Submit for review

### Microsoft Store (Windows)
1. Create Microsoft Developer account
2. Reserve app name
3. Upload MSIX package
4. Complete store listing
5. Submit for certification

## 🔍 Troubleshooting

### Common Issues

#### Android Build Fails
```bash
# Clean and rebuild
cd android
./gradlew clean
cd ..
npx react-native run-android
```

#### iOS Build Fails
```bash
# Clean pods
cd ios
rm -rf Pods Podfile.lock
pod install
cd ..
```

#### Metro Bundler Issues
```bash
# Clear cache
npx react-native start --reset-cache
```

#### Gradle Daemon Issues
```bash
cd android
./gradlew --stop
./gradlew clean
```

## 📊 Performance Optimization

### Android
- Enable Proguard in release builds
- Use AAB format for smaller downloads
- Enable Hermes engine (already configured)

### iOS
- Enable Bitcode
- Use asset catalogs
- Optimize images

### Both Platforms
- Minimize bundle size
- Use code splitting
- Optimize images and assets
- Enable production mode

## 🔐 Security

### API Keys
- Store sensitive keys in `.env` file (not committed to git)
- Use react-native-config for environment variables

### Code Obfuscation
- Android: Proguard (enabled in release)
- iOS: Automatic with Xcode optimization

### SSL Pinning
- Implement certificate pinning for API calls
- Use react-native-ssl-pinning library

## 📚 Additional Resources

- [React Native Docs](https://reactnative.dev/)
- [Android Developer Guide](https://developer.android.com/)
- [iOS Developer Guide](https://developer.apple.com/)
- [React Native Windows](https://microsoft.github.io/react-native-windows/)

## 🆘 Support

For issues or questions:
- Check GitHub Issues
- React Native Community Discord
- Stack Overflow

---

**Version:** 1.0.0  
**Last Updated:** November 2025
