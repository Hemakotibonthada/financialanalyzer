# 🚀 Quick Start - Storage Selection Feature

## Installation

### Download
```
Location: desktop/dist/FinancialAnalyzerSetup-1.0.0.exe
Size: 87.96 MB
```

### Install
1. Run `FinancialAnalyzerSetup-1.0.0.exe`
2. Follow installation wizard
3. Desktop shortcut created automatically

---

## First Launch - Setup Wizard

### What You'll See
- **Setup window** (650x700)
- **Two options:**
  - 💾 **Local Storage** - MongoDB (offline, private)
  - ☁️ **Online Storage** - Firebase (sync, cloud)

### What To Do
1. **Read features** of each option
2. **Select** your preference (click the card)
3. **Click** "Continue" button
4. **Wait** for setup (2-3 seconds)
5. **Start using** the app

---

## Storage Options Comparison

| Feature | 💾 Local | ☁️ Online |
|---------|----------|-----------|
| **Privacy** | ✅ 100% | ⚠️ Cloud |
| **Offline** | ✅ Full | ⚠️ Cache |
| **Multi-device** | ❌ No | ✅ Yes |
| **Backup** | ⚠️ Manual | ✅ Auto |
| **Speed** | ⚡ Fast | 🌐 Network |
| **Setup** | MongoDB | Instant |

---

## Prerequisites

### For Local Storage (💾)
```powershell
# Start MongoDB
.\start-mongodb.ps1

# Start backend
cd backend
npm start
```

### For Online Storage (☁️)
- Internet connection only
- No additional setup

---

## Settings Location

```powershell
%APPDATA%\Financial Analyzer\settings.json
```

**Contents:**
```json
{
  "storageType": "local" | "online",
  "setupCompleted": true,
  "setupDate": "2025-01-23T10:30:00.000Z"
}
```

---

## Common Tasks

### View Settings
```powershell
Get-Content "$env:APPDATA\Financial Analyzer\settings.json"
```

### Reset Setup (Show wizard again)
```powershell
Remove-Item "$env:APPDATA\Financial Analyzer\settings.json"
# Restart app
```

### Switch Storage Type
```powershell
# Edit settings.json
notepad "$env:APPDATA\Financial Analyzer\settings.json"

# Change "storageType": "local" → "online" (or vice versa)
# Save and restart app
```

---

## Troubleshooting

### Setup Wizard Doesn't Appear
```powershell
Remove-Item "$env:APPDATA\Financial Analyzer\settings.json"
```

### Can't Connect to MongoDB
```powershell
# Check if running
mongosh --eval "db.version()"

# Start if not running
.\start-mongodb.ps1
```

### Firebase Not Syncing
- Check internet connection
- Open DevTools: `Ctrl+Shift+I`
- Look for errors in Console

---

## Quick Test

### After Installation
1. ✅ Launch app
2. ✅ See setup wizard
3. ✅ Select storage option
4. ✅ Click Continue
5. ✅ Main app opens
6. ✅ Add a test expense
7. ✅ Verify it saves
8. ✅ Close and reopen
9. ✅ Data still there

---

## File Locations

### Installer
```
desktop/dist/FinancialAnalyzerSetup-1.0.0.exe
```

### Settings
```
%APPDATA%\Financial Analyzer\settings.json
```

### Logs
```
%APPDATA%\Financial Analyzer\logs\
```

### App Data (Local)
```
MongoDB: localhost:27017/financial-analyzer
```

### App Data (Online)
```
Firebase Firestore: finserveassist project
```

---

## Documentation

📖 **Full Guides:**
- `STORAGE_SETUP_GUIDE.md` - Complete user manual
- `STORAGE_SETUP_TEST.md` - Testing procedures
- `STORAGE_SELECTION_COMPLETE.md` - Implementation details

💡 **In-App Help:**
- Navigate to `/help` in the app
- Press `Ctrl+?` for keyboard shortcuts

---

## Support

### Self-Help
1. Check DevTools Console: `Ctrl+Shift+I`
2. Review settings.json
3. Check MongoDB/Backend status
4. Verify internet for Firebase

### Contact
- App Help Center: `/help` route
- Email: support@financialanalyzer.com
- GitHub Issues: [Repository]

---

## Tips

💡 **For Privacy:** Choose Local Storage  
💡 **For Convenience:** Choose Online Storage  
💡 **For Teams:** Use Online with shared Firebase  
💡 **For Travel:** Online gives access anywhere  
💡 **For Speed:** Local is fastest  

---

## Advanced

### Custom Firebase Project
Edit `frontend/src/services/firebase.js`:
```javascript
const firebaseConfig = {
  apiKey: "YOUR_KEY",
  projectId: "YOUR_PROJECT",
  // ... other config
};
```

### Custom Backend URL
Edit `frontend/src/services/storage.js`:
```javascript
let localApiUrl = 'http://your-server:port/api';
```

---

## Version Info

- **Version:** 1.0.0
- **Release:** January 2025
- **Installer Size:** 87.96 MB
- **Platform:** Windows 10/11
- **Architecture:** x64

---

## Next Steps After Setup

1. **Profile** - Add your information
2. **Dashboard** - View overview
3. **Expenses** - Track spending
4. **Budget** - Set limits
5. **Goals** - Plan savings
6. **Reports** - Analyze finances

---

**🎉 Enjoy Financial Analyzer!**

*For detailed documentation, see STORAGE_SETUP_GUIDE.md*
