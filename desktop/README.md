# Financial Analyzer Desktop App

Windows desktop application for Financial Analyzer built with Electron.

## Features

- 💰 **Expense Tracking**: Track and categorize your expenses
- 📊 **EMI Management**: Manage loans and EMI payments
- 💳 **Lender Dashboard**: Track loans given to others
- 📅 **Bill Reminders**: Never miss a bill payment
- 📈 **Financial Health Dashboard**: Comprehensive financial analytics
- 🔔 **System Tray Integration**: Quick access from system tray
- ⌨️ **Keyboard Shortcuts**: Navigate quickly with shortcuts

## Prerequisites

- Windows 10/11 (64-bit)
- Backend server running on localhost:5001

## Installation from Source

1. **Install dependencies**:
   ```bash
   cd desktop
   npm install
   ```

2. **Start backend server**:
   ```bash
   cd ../backend
   npm start
   ```

3. **Run desktop app**:
   ```bash
   cd ../desktop
   npm start
   ```

## Building Installer

1. **Build frontend**:
   ```bash
   cd ../frontend
   npm run build
   ```

2. **Build desktop installer**:
   ```bash
   cd ../desktop
   npm run dist
   ```

3. **Output**: `desktop/dist/FinancialAnalyzerSetup-1.0.0.exe`

## Installation

1. Run `FinancialAnalyzerSetup-1.0.0.exe`
2. Choose installation directory
3. Desktop shortcut will be created automatically
4. Launch from desktop icon

## Usage

### First Launch
1. Start the backend server first (localhost:5001)
2. Click desktop icon to launch app
3. Login or register new account
4. Start managing your finances

### System Tray
- App minimizes to system tray
- Right-click tray icon for quick access:
  - Dashboard
  - Expenses
  - EMI Tracker
  - Settings
  - Quit

### Keyboard Shortcuts
- `Ctrl+D` - Open Dashboard
- `Ctrl+E` - Open Expenses
- `Ctrl+M` - Open EMI Tracker
- `Ctrl+L` - Open Lender Dashboard
- `Ctrl+B` - Open Bill Reminders
- `Ctrl+H` - Open Financial Health
- `F11` - Toggle Fullscreen
- `Ctrl+W` - Close Window
- `Alt+F4` - Quit Application

## Architecture

- **Electron**: Cross-platform desktop framework
- **React**: Frontend framework (from ../frontend)
- **Node.js**: Backend API server (localhost:5001)
- **electron-builder**: Creates Windows installer with NSIS

## File Structure

```
desktop/
├── main.js           # Electron main process
├── preload.js        # Security bridge
├── package.json      # NPM config & build settings
├── assets/           # Icons and resources
│   ├── icon.ico      # App icon (Windows)
│   ├── icon.png      # PNG version
│   └── tray-icon.png # System tray icon
├── dist/             # Built installers (generated)
└── README.md         # This file
```

## Troubleshooting

### App won't start
- Ensure backend is running on localhost:5001
- Check console for error messages

### Build fails
- Run `npm install` to ensure dependencies
- Build frontend first: `cd ../frontend && npm run build`
- Ensure assets/icon.ico exists

### Icon not showing
- Icon files must be in `assets/` folder
- Rebuild installer after adding icons

## Development

### Development Mode
```bash
npm start
```
- Opens DevTools automatically
- Hot reload with frontend dev server
- Loads from localhost:3000

### Production Build
```bash
npm run dist
```
- Packages frontend from ../frontend/dist
- Creates installer and portable version
- Output in desktop/dist/

## License

MIT License - See LICENSE.txt for details
