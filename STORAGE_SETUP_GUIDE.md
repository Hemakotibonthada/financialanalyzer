# Financial Analyzer - Storage Setup Guide

## Overview

Financial Analyzer now offers flexible storage options during installation. Choose between **Local Storage** (MongoDB) or **Online Storage** (Firebase Firestore) based on your needs.

---

## Setup Wizard

### First Launch

When you first launch Financial Analyzer, you'll see the **Storage Setup Wizard**:

![Setup Wizard](docs/images/setup-wizard.png)

### Storage Options

#### 1. 💾 Local Storage (MongoDB)
**Best for privacy-focused users**

**Features:**
- ✓ Full offline access
- ✓ Complete data privacy
- ✓ Fast performance
- ✓ No internet dependency
- ✓ All data stored locally

**Requirements:**
- MongoDB must be running on `localhost:27017`
- Backend server on `localhost:5001`

**Ideal for:**
- Users who want complete control over their data
- Privacy-conscious individuals
- Users with limited internet connectivity
- Those who prefer offline-first applications

---

#### 2. ☁️ Online Storage (Firebase Firestore)
**Best for multi-device users**

**Features:**
- ✓ Multi-device sync
- ✓ Cloud backup
- ✓ Access anywhere
- ✓ Automatic updates
- ✓ Built-in security

**Requirements:**
- Active internet connection
- Firebase account (automatic setup)

**Ideal for:**
- Users who work across multiple devices
- Those who want automatic backups
- Users who need remote access
- Teams sharing financial data

---

## Making Your Choice

### During Installation

1. **Launch the app** - The setup wizard appears automatically on first run
2. **Review options** - Read the features of each storage type
3. **Select your preference** - Click on your chosen storage option
4. **Confirm** - Click the "Continue" button
5. **Wait for setup** - The app will configure your chosen storage
6. **Start using** - Main application opens automatically

### Visual Selection

The setup wizard provides:
- Clear feature comparisons
- Visual indicators for each option
- Easy selection with radio buttons
- Beautiful gradient design

---

## Technical Details

### Local Storage Configuration

**Storage Location:**
```
MongoDB: mongodb://localhost:27017/financial-analyzer
Backend: http://localhost:5001/api
```

**Data Structure:**
- Collections: expenses, incomes, budgets, goals, loans, lenders, emis, bill-reminders
- All data encrypted and stored locally
- No external dependencies

**Setup Requirements:**
1. Start MongoDB:
   ```powershell
   .\start-mongodb.ps1
   ```

2. Start backend:
   ```bash
   cd backend
   npm start
   ```

### Online Storage Configuration

**Firebase Project:**
- Project ID: `finserveassist`
- Region: Multi-region
- Authentication: Automatic
- Security Rules: User-scoped

**Data Structure:**
- Firestore collections mirror local structure
- User ID scoping for privacy
- Automatic sync across devices
- Offline persistence enabled

**Setup Requirements:**
- Internet connection
- Firebase automatically initialized
- No manual configuration needed

---

## Settings Storage

Your storage preference is saved in:
```
%APPDATA%/Financial Analyzer/settings.json
```

**Settings File Structure:**
```json
{
  "storageType": "local" | "online",
  "setupCompleted": true,
  "setupDate": "2025-01-23T10:30:00.000Z"
}
```

---

## Changing Storage Type

### Method 1: Reset and Reconfigure

1. Close the application
2. Delete settings file:
   ```powershell
   Remove-Item "$env:APPDATA\Financial Analyzer\settings.json"
   ```
3. Restart the application
4. Setup wizard will appear again

### Method 2: Manual Edit

1. Close the application
2. Edit settings file:
   ```powershell
   notepad "$env:APPDATA\Financial Analyzer\settings.json"
   ```
3. Change `storageType` value:
   - For local: `"storageType": "local"`
   - For online: `"storageType": "online"`
4. Save and restart

---

## Migration Between Storage Types

### From Local to Online

**Export your data first:**
```bash
# Use the CSV Export feature in the app
1. Open Financial Analyzer
2. Navigate to Import/Export
3. Export all collections
4. Save CSV files
```

**Switch storage:**
1. Change settings to `"storageType": "online"`
2. Restart app
3. Import CSV files to Firebase

### From Online to Local

**Ensure MongoDB is running:**
```powershell
.\start-mongodb.ps1
```

**Export and import:**
1. Export data from Firebase (CSV)
2. Change settings to `"storageType": "local"`
3. Start backend server
4. Import CSV files

---

## Troubleshooting

### Setup Wizard Not Appearing

**Issue:** Main app opens without setup wizard

**Solution:**
1. Check if settings file exists:
   ```powershell
   Test-Path "$env:APPDATA\Financial Analyzer\settings.json"
   ```
2. If exists, delete it to trigger setup:
   ```powershell
   Remove-Item "$env:APPDATA\Financial Analyzer\settings.json"
   ```

### Local Storage Not Working

**Issue:** "Connection refused" or database errors

**Checklist:**
- [ ] MongoDB is running (`mongodb://localhost:27017`)
- [ ] Backend server is running (`http://localhost:5001`)
- [ ] No firewall blocking local connections
- [ ] Settings file has `"storageType": "local"`

**Start MongoDB:**
```powershell
.\start-mongodb.ps1
```

**Start Backend:**
```bash
cd backend
npm start
```

### Online Storage Not Working

**Issue:** Sync failures or authentication errors

**Checklist:**
- [ ] Internet connection active
- [ ] Firebase credentials valid
- [ ] Settings file has `"storageType": "online"`
- [ ] No proxy blocking Firebase

**Verify connection:**
```javascript
// Open DevTools (Ctrl+Shift+I)
// Check console for Firebase initialization messages
```

### Settings File Corrupted

**Issue:** App crashes on startup

**Solution:**
```powershell
# Backup current settings
Copy-Item "$env:APPDATA\Financial Analyzer\settings.json" "$env:APPDATA\Financial Analyzer\settings.json.backup"

# Delete corrupted file
Remove-Item "$env:APPDATA\Financial Analyzer\settings.json"

# Restart app - setup wizard will appear
```

---

## Security Considerations

### Local Storage
- **Encryption:** Data encrypted in MongoDB
- **Access:** Only local machine has access
- **Backup:** Manual backup required
- **Privacy:** 100% private, no cloud access

### Online Storage
- **Encryption:** Firebase encryption at rest and in transit
- **Access:** User-authenticated, scoped by user ID
- **Backup:** Automatic cloud backup
- **Privacy:** Data stored in Firebase servers (Google Cloud)

---

## Performance Comparison

| Feature | Local Storage | Online Storage |
|---------|--------------|----------------|
| **Speed** | Very Fast ⚡ | Fast (depends on connection) |
| **Offline Access** | Full ✅ | Limited (cached data only) |
| **Sync** | No | Yes ✅ |
| **Backup** | Manual | Automatic ✅ |
| **Multi-device** | No | Yes ✅ |
| **Setup Time** | Requires MongoDB | Instant ✅ |
| **Storage Limit** | Disk space | 1GB free (Firebase) |

---

## Advanced Configuration

### Custom Firebase Project

To use your own Firebase project:

1. **Edit Firebase config** in `frontend/src/services/firebase.js`:
   ```javascript
   const firebaseConfig = {
     apiKey: "YOUR_API_KEY",
     authDomain: "YOUR_PROJECT.firebaseapp.com",
     projectId: "YOUR_PROJECT_ID",
     // ... other config
   };
   ```

2. **Rebuild frontend:**
   ```bash
   cd frontend
   npm run build
   ```

3. **Rebuild desktop app:**
   ```bash
   cd desktop
   npm run dist
   ```

### Custom Backend URL

For custom backend server:

1. **Edit storage service** in `frontend/src/services/storage.js`:
   ```javascript
   let localApiUrl = 'http://your-server:port/api';
   ```

2. **Rebuild and reinstall**

---

## Support

For issues or questions:

1. **Check logs:**
   - Desktop app logs: `%APPDATA%/Financial Analyzer/logs`
   - Browser DevTools: `Ctrl+Shift+I` → Console

2. **Common Solutions:**
   - Delete settings.json and reconfigure
   - Verify MongoDB/Backend status
   - Check internet connection for Firebase
   - Review firewall settings

3. **Contact Support:**
   - Email: support@financialanalyzer.com
   - GitHub Issues: [Repository URL]
   - Documentation: `/help` in the app

---

## Recommendations

### For Individual Users
**Recommended: Local Storage**
- Better privacy
- Faster performance
- No cloud dependency

### For Teams
**Recommended: Online Storage**
- Easy collaboration
- Multi-device access
- Automatic backups

### For Travelers
**Recommended: Online Storage**
- Access from anywhere
- Automatic sync
- Cloud backup

### For Privacy-First Users
**Recommended: Local Storage**
- Complete control
- No cloud exposure
- Local encryption

---

## Next Steps

After completing setup:

1. **Create your profile** - Add your financial information
2. **Add transactions** - Start tracking expenses and income
3. **Set budgets** - Define spending limits
4. **Track goals** - Set and monitor financial goals
5. **Generate reports** - Analyze your financial health

---

*Last Updated: January 2025*
*Version: 1.0.0*
