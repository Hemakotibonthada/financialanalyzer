# 🍎 macOS/MacBook Network Setup Guide

## Network Access Configuration for Mac

This guide will help you run the Financial Analyzer on your MacBook and access it from other devices (iPhone, iPad, other computers) on the same network.

---

## 📋 Prerequisites

- macOS (any recent version)
- Node.js installed
- Git repository cloned
- Same WiFi network for all devices

---

## 🚀 Step-by-Step Setup

### 1. Get Your Mac's IP Address

Open Terminal and run:
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -n 1
```

Or use the GUI:
1. Click Apple menu → System Settings (or System Preferences)
2. Go to Network
3. Select your active connection (WiFi or Ethernet)
4. Look for "IP Address"

**Example IP:** `192.168.1.100`

---

### 2. Update Frontend Environment Variables

Edit the `.env` file in the `frontend` folder:

```bash
cd frontend
nano .env
```

Update or add this line with your Mac's IP:
```env
VITE_API_URL=http://YOUR_MAC_IP:5001/api
```

**Example:**
```env
VITE_API_URL=http://192.168.1.100:5001/api
VITE_APP_NAME=Financial Analyzer
```

Save and exit (Ctrl+X, then Y, then Enter)

---

### 3. Verify Backend Configuration

The backend is already configured to listen on all network interfaces (`0.0.0.0`). No changes needed!

**File:** `backend/server.js` already has:
```javascript
server.listen(PORT, '0.0.0.0', () => { ... });
```

✅ This is correct for network access.

---

### 4. Verify Frontend Vite Configuration

The `frontend/vite.config.js` is already configured:
```javascript
server: {
  host: '0.0.0.0', // Listen on all network interfaces
  port: 3000,
}
```

✅ This is correct for network access.

---

### 5. Configure macOS Firewall (if enabled)

#### Check if Firewall is ON:
```bash
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate
```

#### If Firewall is ON, allow Node.js:

**Option 1: Allow Node.js completely (Recommended)**
```bash
# Find Node.js path
which node

# Add Node.js to firewall exceptions (will prompt for password)
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add $(which node)
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblockapp $(which node)
```

**Option 2: Use GUI**
1. Go to System Settings → Network → Firewall
2. Click "Options" or "Firewall Options"
3. Click the "+" button
4. Navigate to Node.js binary (usually in `/usr/local/bin/node` or `/opt/homebrew/bin/node`)
5. Add it and set to "Allow incoming connections"

**Option 3: Temporarily disable firewall for testing**
```bash
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --setglobalstate off
```

---

### 6. Start the Servers

#### Terminal 1 - Start Backend:
```bash
cd backend
node server.js
```

You should see:
```
✅ Server running on port 5001
🏠 Local: http://localhost:5001
🌐 Network: http://YOUR_IP:5001
```

#### Terminal 2 - Start Frontend:
```bash
cd frontend
npm run dev
```

You should see:
```
VITE v5.4.21  ready in XXX ms

➜  Local:   http://localhost:3000/
➜  Network: http://YOUR_IP:3000/
```

---

## 📱 Access from Other Devices

### From iPhone/iPad
1. Connect to the same WiFi as your MacBook
2. Open Safari or any browser
3. Enter: `http://YOUR_MAC_IP:3000`
4. Example: `http://192.168.1.100:3000`

### From Another Mac/PC
1. Connect to the same WiFi
2. Open any browser
3. Enter: `http://YOUR_MAC_IP:3000`

---

## 🔍 Testing & Verification

### Test Backend API:
```bash
# From Mac terminal
curl http://localhost:5001/api/health

# From another device (browser or terminal)
curl http://YOUR_MAC_IP:5001/api/health
```

Should return: `{"status":"ok"}`

### Test Frontend:
Open browser and go to:
- **Local:** `http://localhost:3000`
- **Network:** `http://YOUR_MAC_IP:3000`

---

## 🛠️ Troubleshooting

### Issue 1: "Connection Refused" from mobile

**Solution:**
```bash
# Check if servers are running
lsof -i :5001  # Backend
lsof -i :3000  # Frontend

# Check if firewall is blocking
sudo /usr/libexec/ApplicationFirewall/socketfilterfw --listapps | grep -i node
```

### Issue 2: "Network Error" when logging in

**Solution:**
1. Verify `.env` file has correct IP:
   ```bash
   cat frontend/.env
   ```
2. Restart frontend after changing .env:
   ```bash
   cd frontend
   npm run dev
   ```

### Issue 3: IP Address Changed

**When you connect to different WiFi:**
1. Get new IP address:
   ```bash
   ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}'
   ```
2. Update `frontend/.env` with new IP
3. Restart frontend server

### Issue 4: Can't access from iPhone but works on Mac

**Solutions:**
1. Both devices must be on the **same WiFi network**
2. Some corporate/guest WiFi networks block device-to-device communication
3. Try disabling VPN on either device
4. Check firewall settings on Mac

### Issue 5: Port already in use

**Solution:**
```bash
# Find and kill process on port 5001
lsof -ti:5001 | xargs kill -9

# Find and kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

---

## 📝 Quick Reference Commands

### Get Mac IP Address:
```bash
ipconfig getifaddr en0  # WiFi
# or
ipconfig getifaddr en1  # Ethernet
```

### Check Running Servers:
```bash
lsof -i :5001  # Backend
lsof -i :3000  # Frontend
```

### Stop All Node Processes:
```bash
pkill -f node
```

### View Backend Logs:
```bash
cd backend
node server.js 2>&1 | tee server.log
```

---

## 🔐 Security Notes

### For Development (Current Setup):
- ✅ Local network access only
- ✅ Same WiFi required
- ✅ No external internet access
- ⚠️ Using HTTP (not HTTPS)

### For Production:
Consider:
- Using HTTPS with SSL certificates
- Setting up proper authentication
- Using environment-specific configurations
- Implementing rate limiting
- Configuring CORS properly

---

## 📋 Complete Setup Script

Create a file `setup-mac.sh`:

```bash
#!/bin/bash

echo "=========================================="
echo "Financial Analyzer - macOS Network Setup"
echo "=========================================="
echo ""

# Get IP address
IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -n 1)
echo "📍 Your Mac's IP Address: $IP"
echo ""

# Update .env file
echo "📝 Updating frontend/.env..."
cat > frontend/.env << EOL
# Frontend configuration
# Network/Mobile Access Mode - Access from any device on same network
VITE_API_URL=http://$IP:5001/api

VITE_APP_NAME=Financial Analyzer

# Current Network IP: $IP
# Access from mobile: http://$IP:3000
EOL

echo "✅ Updated frontend/.env with IP: $IP"
echo ""

# Check firewall
echo "🔍 Checking firewall status..."
FIREWALL_STATUS=$(sudo /usr/libexec/ApplicationFirewall/socketfilterfw --getglobalstate)
echo "$FIREWALL_STATUS"
echo ""

if [[ $FIREWALL_STATUS == *"enabled"* ]]; then
    echo "⚠️  Firewall is enabled. Adding Node.js to exceptions..."
    NODE_PATH=$(which node)
    sudo /usr/libexec/ApplicationFirewall/socketfilterfw --add "$NODE_PATH"
    sudo /usr/libexec/ApplicationFirewall/socketfilterfw --unblockapp "$NODE_PATH"
    echo "✅ Node.js added to firewall exceptions"
else
    echo "✅ Firewall is disabled or already configured"
fi
echo ""

echo "=========================================="
echo "Setup Complete! 🎉"
echo "=========================================="
echo ""
echo "📱 Access from other devices:"
echo "   Frontend: http://$IP:3000"
echo "   Backend:  http://$IP:5001"
echo ""
echo "🚀 To start servers:"
echo "   Terminal 1: cd backend && node server.js"
echo "   Terminal 2: cd frontend && npm run dev"
echo ""
```

Make it executable and run:
```bash
chmod +x setup-mac.sh
./setup-mac.sh
```

---

## 🌟 Alternative: Using Simple HTTP Server

If you want to access the built production version:

```bash
# Build frontend
cd frontend
npm run build

# Serve with Python (built-in on Mac)
cd dist
python3 -m http.server 3000 --bind 0.0.0.0

# Or use Node.js http-server
npm install -g http-server
http-server dist -p 3000 -a 0.0.0.0
```

---

## 📞 Support & Debugging

### Enable Debug Mode:
```bash
# Backend with debug logs
cd backend
DEBUG=* node server.js

# Frontend with verbose output
cd frontend
npm run dev -- --debug
```

### Check Network Connectivity:
```bash
# From Mac, test if ports are accessible
nc -zv YOUR_IP 3000
nc -zv YOUR_IP 5001

# From iPhone/iPad (using Network Utility or similar)
# Or just try accessing in browser
```

---

## ✅ Checklist

Before accessing from mobile:

- [ ] Mac IP address identified
- [ ] `frontend/.env` updated with Mac IP
- [ ] Firewall configured (if enabled)
- [ ] Backend server running (`http://YOUR_IP:5001`)
- [ ] Frontend server running (`http://YOUR_IP:3000`)
- [ ] Both devices on same WiFi
- [ ] Tested backend health endpoint
- [ ] Tested frontend in browser

---

**Status:** Ready for macOS deployment  
**Last Updated:** October 25, 2025  
**Platform:** macOS (Intel & Apple Silicon)
