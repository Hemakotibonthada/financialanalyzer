# 🚀 Quick Start - Financial Analyzer Mobile App

Get your mobile app running in **5 minutes**!

---

## ⚡ Fast Track Setup

### Step 1: Install Dependencies (2 mins)

```bash
cd mobile
npm install
```

**For iOS only:**
```bash
cd ios
pod install
cd ..
```

---

### Step 2: Configure API URL (1 min)

Open `mobile/src/services/api.js` and update line 8:

**For Android Emulator:**
```javascript
const API_URL = 'http://10.0.2.2:5001/api';
```

**For iOS Simulator:**
```javascript
const API_URL = 'http://localhost:5001/api';
```

**For Physical Device:**
```javascript
const API_URL = 'http://YOUR_COMPUTER_IP:5001/api';
```

**To find your IP:**
- **Windows**: Run `ipconfig` in PowerShell
- **macOS/Linux**: Run `ifconfig` in Terminal

---

### Step 3: Start Backend (30 seconds)

Open a terminal and run:

```bash
cd backend
npm run dev
```

Backend should be running on `http://localhost:5001`

---

### Step 4: Run Mobile App (1 min)

Open a **new terminal**:

**For Android:**
```bash
cd mobile
npm run android
```

**For iOS:**
```bash
cd mobile
npm run ios
```

---

## ✅ Success! 

If you see the login screen, you're all set! 🎉

### Default Test Account

```
Email: test@example.com
Password: test123
```

Or create a new account using the **Sign Up** button.

---

## 🎯 What You Can Do Now

1. **Login/Register** - Create your account
2. **Dashboard** - View financial overview
3. **EMI Tracker** - Add and track loans
4. **Bill Reminders** - Set up bill alerts
5. **Investments** - Monitor your portfolio
6. **Profile** - Update settings

---

## 🐛 Quick Fixes

### "Unable to connect to server"
- Check backend is running on port 5001
- Verify API_URL in `src/services/api.js`
- For physical devices, use your computer's IP address

### "Metro Bundler not starting"
```bash
npx react-native start --reset-cache
```

### "Build failed"

**Android:**
```bash
cd android && ./gradlew clean && cd ..
npm run android
```

**iOS:**
```bash
cd ios && pod install && cd ..
npm run ios
```

---

## 📱 Device Setup

### Android Physical Device

1. Enable **Developer Options**:
   - Settings → About Phone → Tap "Build Number" 7 times
   
2. Enable **USB Debugging**:
   - Settings → Developer Options → USB Debugging

3. Connect via USB and run:
```bash
npm run android
```

### iOS Physical Device

1. Open `mobile/ios/FinancialAnalyzer.xcworkspace` in Xcode
2. Connect iPhone/iPad via USB
3. Select device from top menu
4. Click **Run** button or press `Cmd+R`

---

## 🔧 Common Commands

```bash
# Start Metro Bundler
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios

# Clean and rebuild
npm run clean:android
npm run clean:ios
```

---

## 📚 Need More Help?

- **Full Setup Guide**: [MOBILE_SETUP_GUIDE.md](./MOBILE_SETUP_GUIDE.md)
- **Project README**: [README.md](./README.md)
- **Backend Setup**: [../README.md](../README.md)

---

## 🎨 Features Available

✅ **Authentication** - Login/Register with JWT  
✅ **Dashboard** - Financial overview & quick actions  
✅ **EMI Tracker** - Loan management & payments  
✅ **Bill Reminders** - Bill tracking with categories  
✅ **Investments** - Portfolio tracking & analytics  
✅ **Profile** - Settings & preferences  

---

## 🚀 Next Steps

1. **Test all features** - Navigate through each screen
2. **Check API integration** - Ensure all data loads
3. **Customize UI** - Update colors in `src/theme.js`
4. **Add app icon** - See MOBILE_SETUP_GUIDE.md
5. **Build for production** - Generate APK/IPA

---

**That's it! You're ready to go! 🎉**

Happy coding! 💻

---

*For detailed setup instructions, troubleshooting, and deployment guides, see MOBILE_SETUP_GUIDE.md*
