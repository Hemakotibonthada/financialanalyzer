# Financial Analyzer Mobile App

Cross-platform mobile application for Android, iOS, and Windows built with React Native.

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18
- npm >= 9
- For Android: Android Studio & Android SDK
- For iOS: macOS with Xcode 15+
- For Windows: Windows 10 SDK & Visual Studio 2022

### Installation

```bash
cd mobile
npm install
```

### Configuration

1. **Update Backend URL** in `src/services/api.js`:
   ```javascript
   // For Android Emulator
   const API_BASE_URL = 'http://10.0.2.2:5001/api';
   
   // For iOS Simulator  
   const API_BASE_URL = 'http://localhost:5001/api';
   
   // For Physical Device (use your computer's IP)
   const API_BASE_URL = 'http://YOUR_IP:5001/api';
   ```

2. **Platform-Specific Setup**:

   **Android:**
   ```bash
   npx react-native link
   ```

   **iOS (macOS only):**
   ```bash
   cd ios && pod install && cd ..
   ```

   **Windows:**
   ```bash
   npx react-native-windows-init --overwrite
   ```

### Running the App

**Start Backend First:**
```bash
# In the main project directory
cd backend
npm start
```

**Then Start Mobile App:**

**Android:**
```bash
npm run android
```

**iOS:**
```bash
npm run ios
```

**Windows:**
```bash
npx react-native run-windows
```

## 📱 Features

### ✅ Implemented
- **Authentication**: Login, Register with JWT token management
- **Financial Health Dashboard**: Overview of your financial status with health score
- **Company Expenses**: Track and manage business expenses with analytics
- **EMI Tracker**: Monitor EMI payments and schedules
- **Lender Dashboard**: Track loans given to others with repayment tracking
- **Bill Reminders**: Never miss a bill payment
- **Navigation**: Bottom tabs + drawer navigation
- **Charts & Analytics**: Visual representations using react-native-chart-kit
- **Search & Filter**: Quick access to financial data
- **Refresh Control**: Pull to refresh data
- **Responsive Design**: Works on phones and tablets

### 🔜 Coming Soon
- Push Notifications for bill reminders
- PDF/Excel export with password protection
- Biometric authentication
- Offline mode with data sync
- Multi-currency support
- Budget planning tools

## 📂 Project Structure

```
mobile/
├── src/
│   ├── screens/           # All app screens
│   │   ├── Auth/          # Login, Register
│   │   ├── Dashboard/     # Financial Health Dashboard
│   │   ├── CompanyExpenses/ # Expense tracking
│   │   ├── EMI/           # EMI tracker
│   │   ├── Lender/        # Loans given management
│   │   ├── BillReminders/ # Bill reminders
│   │   └── Profile/       # User profile
│   ├── navigation/        # Navigation configuration
│   ├── services/          # API services
│   │   └── api.js         # Axios instance & endpoints
│   ├── context/           # React Context providers
│   ├── theme.js           # App theme & styling
│   └── App.js             # Root component
├── android/               # Android native code
├── ios/                   # iOS native code
├── windows/               # Windows native code (if initialized)
├── package.json
├── BUILD_GUIDE.md         # Detailed build instructions
└── README.md              # This file
```

## 🎨 Screens

### Auth Flow
- **Login Screen**: Email/password authentication
- **Register Screen**: New user registration with DOB, phone

### Main App
- **Dashboard**: Financial health score, insights, expense breakdown
- **Company Expenses**: Add, edit, delete expenses with filters
- **EMI Tracker**: View EMI schedule, record payments
- **Lender Dashboard**: Track loans given with repayment progress
- **Bill Reminders**: Upcoming bills and payment tracking
- **Profile**: User settings and account management

## 🔧 Configuration

### Theme Customization
Edit `src/theme.js` to customize colors, typography, and spacing:

```javascript
export const theme = {
  colors: {
    primary: '#4F46E5',
    secondary: '#10B981',
    error: '#EF4444',
    // ... more colors
  },
  // ... typography, spacing, etc.
};
```

### API Endpoints
All API calls are centralized in `src/services/api.js`:
- `authAPI`: Login, register, profile management
- `expensesAPI`: Company expenses CRUD
- `emiAPI`: EMI tracking
- `lenderAPI`: Loans given management
- `billRemindersAPI`: Bill reminders
- `financialHealthAPI`: Dashboard data

## 📦 Building for Production

### Android APK
```bash
cd android
./gradlew assembleRelease
# Output: android/app/build/outputs/apk/release/app-release.apk
```

### iOS IPA
```bash
# Open in Xcode
open ios/FinancialAnalyzer.xcworkspace
# Product -> Archive -> Distribute App
```

### Windows MSIX
```bash
npx react-native run-windows --release
# Or use Visual Studio -> Create App Packages
```

See [BUILD_GUIDE.md](./BUILD_GUIDE.md) for detailed build instructions.

## 🧪 Testing

### Run on Emulator/Simulator
```bash
# Android Emulator
npm run android

# iOS Simulator (macOS)
npm run ios

# Windows Simulator
npx react-native run-windows
```

### Install on Physical Device

**Android:**
```bash
adb install android/app/build/outputs/apk/release/app-release.apk
```

**iOS:**
Use Xcode's Devices & Simulators window

**Windows:**
Double-click the MSIX package

## 🐛 Troubleshooting

### Common Issues

**Metro Bundler Port in Use:**
```bash
npx react-native start --reset-cache --port 8082
```

**Android Build Fails:**
```bash
cd android && ./gradlew clean && cd ..
```

**iOS Build Fails:**
```bash
cd ios && rm -rf Pods Podfile.lock && pod install && cd ..
```

**Can't Connect to Backend:**
- Check backend is running on port 5001
- Verify API_BASE_URL in `src/services/api.js`
- For physical devices, use computer's IP address
- Check firewall settings

### Getting Device IP

**Windows:**
```bash
ipconfig
# Look for IPv4 Address
```

**macOS/Linux:**
```bash
ifconfig
# Look for inet address
```

## 📚 Dependencies

### Core
- React Native 0.73.2
- React Navigation 6.x
- React Native Paper (UI components)

### Data & API
- Axios (HTTP client)
- AsyncStorage (local storage)

### Charts & Visualization
- react-native-chart-kit
- react-native-svg

### Utilities
- date-fns (date formatting)
- lodash (utility functions)
- react-native-vector-icons

## 🔒 Security

- JWT token authentication
- Secure storage with AsyncStorage
- HTTPS API communication
- Password hashing (backend)
- Document password protection

## 🌐 Network Configuration

The app requires network access to the backend API. Ensure:
1. Backend server is running
2. Firewall allows connections on port 5001
3. For physical devices, computer and device are on same network

## 📄 License

This project is part of the Financial Analyzer system.

## 🆘 Support

For issues or questions:
- Check existing documentation
- Review error logs in console
- Ensure all dependencies are installed
- Verify backend is running

## 🎯 Next Steps

1. Configure backend URL for your environment
2. Run the app on your preferred platform
3. Test authentication flow
4. Explore all features
5. Build for production when ready

## 🔄 Updates

Keep the app updated:
```bash
cd mobile
npm update
```

For React Native updates:
```bash
npx react-native upgrade
```

---

**Built with ❤️ using React Native**
