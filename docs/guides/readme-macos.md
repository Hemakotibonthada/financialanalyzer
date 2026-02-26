# 🍎 Financial Analyzer - macOS Quick Start

## For MacBook Users (Intel & Apple Silicon)

### 🚀 One-Command Setup

```bash
# Make script executable and run
chmod +x setup-mac.sh
./setup-mac.sh
```

This will:
- ✅ Auto-detect your Mac's IP address
- ✅ Update configuration files
- ✅ Check and install dependencies
- ✅ Configure firewall (with your permission)
- ✅ Start both servers
- ✅ Display access URLs

---

## 📱 Quick Access

### From Your Mac:
- **Frontend:** http://localhost:3000
- **Backend:** http://localhost:5001

### From iPhone/iPad/Other Devices:
- **Frontend:** http://YOUR_MAC_IP:3000
- **Backend:** http://YOUR_MAC_IP:5001

**Example:** `http://192.168.1.100:3000`

---

## 🎯 Manual Setup (Alternative)

### Step 1: Get Your IP
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -n 1
```

### Step 2: Update Environment File
```bash
# Edit frontend/.env
nano frontend/.env
```

Add this line with your IP:
```
VITE_API_URL=http://YOUR_IP:5001/api
```

### Step 3: Start Servers

**Terminal 1 (Backend):**
```bash
cd backend
node server.js
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
```

---

## 🔥 Quick Start (After Initial Setup)

```bash
# One-command start
chmod +x start-mac.sh
./start-mac.sh
```

Or start individually:
```bash
# Terminal 1
cd backend && node server.js

# Terminal 2
cd frontend && npm run dev
```

---

## 🛠️ Troubleshooting

### "Port already in use"
```bash
# Kill processes on ports
lsof -ti:5001 | xargs kill -9  # Backend
lsof -ti:3000 | xargs kill -9  # Frontend
```

### "Can't connect from iPhone"
1. Check both devices on same WiFi
2. Configure firewall:
```bash
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add $(which node)
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblockapp $(which node)
```

### IP Address Changed
```bash
# Run setup again
./setup-mac.sh
```

---

## 📚 Full Documentation

See `MACOS_NETWORK_SETUP.md` for complete details, troubleshooting, and advanced configuration.

---

## ✅ What Works

- ✅ Access from Mac (localhost)
- ✅ Access from iPhone/iPad (same WiFi)
- ✅ Access from other Macs/PCs (same WiFi)
- ✅ All features (EMI Tracker, Reports, Analytics)
- ✅ PDF Export with charts and data tables
- ✅ Real-time updates via WebSocket
- ✅ File uploads and processing
- ✅ CIBIL integration
- ✅ Personal Loans tracking

---

## 🔐 Network Security

- ✅ Local network only (no internet exposure)
- ✅ Same WiFi required
- ✅ CORS configured for network access
- ⚠️ Using HTTP (for development)

---

## 💡 Tips

1. **Bookmark the IP URL** on your iPhone for quick access
2. **Add to Home Screen** for app-like experience
3. **Keep Mac awake** while accessing from mobile
4. **Use same WiFi** on all devices
5. **Restart servers** if IP changes

---

## 🆘 Quick Commands

```bash
# Get IP address
ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}'

# Check if servers running
lsof -i :5001  # Backend
lsof -i :3000  # Frontend

# Stop all Node processes
pkill -f node

# Test backend
curl http://YOUR_IP:5001/api/health

# Full setup
./setup-mac.sh

# Quick start
./start-mac.sh
```

---

**Last Updated:** October 25, 2025  
**Platform:** macOS (Intel & Apple Silicon)  
**Status:** ✅ Ready to use
