# React Native Project Initialization Guide

## 🚀 Initial Setup Commands

Since the native Android and iOS folders require React Native CLI to generate, follow these steps:

### Step 1: Install React Native CLI

```bash
npm install -g react-native-cli
```

### Step 2: Initialize React Native Project

```bash
# From the Financial_Analyzer root directory
npx react-native init FinancialAnalyzer --directory mobile --version 0.73.2
```

This will create the Android and iOS folders with all necessary native code.

### Step 3: Replace Files

After initialization, the following files have already been created for you:

```bash
mobile/
├── src/                    # ✅ Already created
├── package.json            # ✅ Already created (replace generated one)
├── index.js                # ✅ Already created (replace generated one)
├── app.json                # ✅ Already created (replace generated one)
├── babel.config.js         # ✅ Already created (replace generated one)
├── metro.config.js         # ✅ Already created (replace generated one)
└── Documentation files     # ✅ Already created
```

### Step 4: Install Dependencies

```bash
cd mobile
npm install
```

### Step 5: iOS Setup (macOS only)

```bash
cd ios
pod install
cd ..
```

### Step 6: Link Assets (Icons)

```bash
npx react-native link react-native-vector-icons
```

### Step 7: Run the App

**Android:**
```bash
npm run android
```

**iOS:**
```bash
npm run ios
```

---

## 🔧 Alternative: Manual Native Setup

If you prefer to set up native folders manually or face issues with init:

### Android Setup

1. Create the following structure:
```
mobile/android/
├── app/
│   ├── src/
│   │   └── main/
│   │       ├── java/com/financialanalyzer/
│   │       │   ├── MainActivity.java
│   │       │   └── MainApplication.java
│   │       ├── res/
│   │       └── AndroidManifest.xml
│   └── build.gradle
├── gradle/
├── build.gradle
├── settings.gradle
└── gradle.properties
```

2. Use the `android` folder from a fresh React Native 0.73.2 init as a template.

### iOS Setup

1. Create the following structure:
```
mobile/ios/
├── FinancialAnalyzer/
│   ├── AppDelegate.h
│   ├── AppDelegate.mm
│   ├── Info.plist
│   └── main.m
├── FinancialAnalyzer.xcodeproj/
└── Podfile
```

2. Use the `ios` folder from a fresh React Native 0.73.2 init as a template.

---

## ⚡ Quick Commands Reference

```bash
# Clean and rebuild Android
cd android && ./gradlew clean && cd ..
npm run android

# Clean and rebuild iOS
cd ios && pod deintegrate && pod install && cd ..
npm run ios

# Reset Metro cache
npx react-native start --reset-cache

# Check for issues
npx react-native doctor

# Link native dependencies
npx react-native link
```

---

## 🎯 What's Already Done

All the React Native JavaScript code is complete:
- ✅ All screens and components
- ✅ Navigation structure
- ✅ API integration
- ✅ Authentication flow
- ✅ State management
- ✅ Theming system
- ✅ All dependencies listed in package.json

Only the native Android and iOS folders need to be generated using React Native CLI.

---

## 📝 Important Notes

1. **The `npx react-native init` command will create:**
   - `android/` folder with all Android native code
   - `ios/` folder with all iOS native code
   - Default template files (which you'll replace with our custom ones)

2. **Our custom files will override:**
   - `package.json` (with all our dependencies)
   - `index.js` (with our app entry point)
   - `App.js` (replaced by our `src/App.js`)
   - Config files (babel, metro, app.json)

3. **Keep from generated project:**
   - Entire `android/` folder
   - Entire `ios/` folder
   - `.gitignore`
   - `Gemfile` (for iOS)

---

## 🔍 Verification Checklist

After setup, verify:

- [ ] `android/` folder exists with app/src/main structure
- [ ] `ios/` folder exists with .xcodeproj and Podfile
- [ ] `node_modules/` is populated
- [ ] `ios/Pods/` is populated (after pod install)
- [ ] `npm start` runs without errors
- [ ] `npm run android` builds and runs
- [ ] `npm run ios` builds and runs

---

## 🚨 Troubleshooting

### "android/ios folders not found"
- Run `npx react-native init FinancialAnalyzer --directory mobile`

### "Command not found: react-native"
- Install globally: `npm install -g react-native-cli`

### "Dependency mismatch"
- Delete `node_modules` and `package-lock.json`
- Run `npm install` again

### "Pod install failed"
- Update CocoaPods: `sudo gem install cocoapods`
- Clean pods: `cd ios && pod deintegrate && pod install`

---

**Once the native folders are generated, you're ready to build and run! 🎉**
