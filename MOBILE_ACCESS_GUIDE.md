# 📱 Mobile Access Setup Guide

This guide will help you access the Financial Analyzer from your mobile phone on the same network.

## ✅ Prerequisites

1. **PC and Mobile on Same Network**: Ensure both devices are connected to the same Wi-Fi network
2. **Node.js Running**: Backend and Frontend servers must be running
3. **Firewall Configuration**: Windows Firewall must allow Node.js connections

---

## 🚀 Quick Setup

### Step 1: Configure for Network Access

Run this command in the project root:

```powershell
node setup-network.js network
```

This will automatically:
- Detect your PC's network IP address
- Update frontend `.env` file with the correct API URL
- Display the mobile access URL

### Step 2: Configure Windows Firewall

Run PowerShell **as Administrator** and execute:

```powershell
# Allow Node.js through firewall for ports 3000 and 5001
netsh advfirewall firewall add rule name="Node.js Port 3000" dir=in action=allow protocol=TCP localport=3000
netsh advfirewall firewall add rule name="Node.js Port 5001" dir=in action=allow protocol=TCP localport=5001
```

### Step 3: Start Servers

**Terminal 1 - Backend:**
```powershell
cd backend
npm start
```

**Terminal 2 - Frontend:**
```powershell
cd frontend
npm run dev
```

### Step 4: Access from Mobile

1. Check the console output for your network IP (e.g., `172.29.11.204`)
2. On your mobile browser, navigate to: `http://YOUR_IP:3000`
3. Login with your credentials

Example: `http://172.29.11.204:3000`

---

## 🔄 Switch Between Local and Network Mode

### Enable Network/Mobile Access:
```powershell
node setup-network.js network
```

### Switch Back to Local Mode:
```powershell
node setup-network.js local
```

**Important**: Restart the frontend after switching modes:
```powershell
cd frontend
npm run dev
```

---

## 🔍 Get Network Information

To check your current network configuration:

```powershell
node get-network-info.js
```

This will display:
- Available network interfaces
- Current IP address
- Mobile access URLs
- Configuration steps

---

## ⚙️ Manual Configuration

If automatic setup doesn't work, configure manually:

### 1. Find Your IP Address

**Windows:**
```powershell
ipconfig
```
Look for "IPv4 Address" under your active network adapter (e.g., `192.168.1.100`)

**Alternative:**
```powershell
node get-network-info.js
```

### 2. Update Frontend `.env`

Edit `frontend/.env`:

```env
# Network Access Mode
VITE_API_URL=http://YOUR_IP_ADDRESS:5001/api
VITE_APP_NAME=Financial Analyzer
```

Example:
```env
VITE_API_URL=http://192.168.1.100:5001/api
```

### 3. Backend Configuration

The backend is already configured to accept network connections.
No changes needed! ✅

---

## 🧪 Testing the Connection

### Test Backend API:

From your mobile browser or PC:
```
http://YOUR_IP:5001/health
```

You should see:
```json
{
  "success": true,
  "message": "Financial Analyzer API is running",
  "timestamp": "2025-10-25T..."
}
```

### Test Frontend:

Navigate to:
```
http://YOUR_IP:3000
```

You should see the login page.

---

## 🔧 Troubleshooting

### Problem: Cannot Connect from Mobile

**Solution 1: Check Network**
- Verify PC and mobile are on the **same Wi-Fi network**
- Use `ipconfig` to confirm your IP address hasn't changed

**Solution 2: Restart Servers**
```powershell
# Stop servers (Ctrl+C)
# Then restart:
cd backend && npm start
cd frontend && npm run dev
```

**Solution 3: Check Firewall**
```powershell
# Run as Administrator
netsh advfirewall firewall show rule name="Node.js Port 3000"
netsh advfirewall firewall show rule name="Node.js Port 5001"
```

If rules don't exist, add them:
```powershell
netsh advfirewall firewall add rule name="Node.js Port 3000" dir=in action=allow protocol=TCP localport=3000
netsh advfirewall firewall add rule name="Node.js Port 5001" dir=in action=allow protocol=TCP localport=5001
```

**Solution 4: Disable Windows Firewall Temporarily (Testing Only)**
```powershell
# Run as Administrator - FOR TESTING ONLY
netsh advfirewall set allprofiles state off

# Re-enable after testing
netsh advfirewall set allprofiles state on
```

### Problem: CORS Errors

The backend is already configured to accept connections from network IPs.
If you see CORS errors:

1. Check `backend/server.js` - CORS should allow dynamic network IPs
2. Clear browser cache on mobile
3. Restart backend server

### Problem: WebSocket Connection Failed

WebSocket configuration is dynamic and uses the same URL as the API.
If real-time updates don't work:

1. Check `frontend/src/context/WebSocketContext.jsx`
2. Verify backend is running and showing WebSocket enabled
3. Check mobile browser console for errors

### Problem: IP Address Changed

Your IP may change after:
- Reconnecting to Wi-Fi
- Restarting router
- DHCP lease renewal

**Solution:**
```powershell
# Reconfigure with new IP
node setup-network.js network

# Restart frontend
cd frontend
npm run dev
```

---

## 📊 Network Architecture

```
Mobile Device (192.168.1.50)
    ↓ Wi-Fi
Router (192.168.1.1)
    ↓ Wi-Fi
PC (192.168.1.100)
    ├── Backend (Port 5001)
    │   ├── API: http://192.168.1.100:5001/api
    │   └── WebSocket: ws://192.168.1.100:5001
    └── Frontend (Port 3000)
        └── http://192.168.1.100:3000
```

---

## 🔒 Security Considerations

### Development Mode (Current Setup)
- ✅ Suitable for local network access
- ✅ No authentication on network level
- ⚠️ Do NOT expose to public internet

### Production Deployment
For production, consider:
- HTTPS/SSL certificates
- API Gateway with authentication
- VPN for remote access
- Rate limiting
- Network-level security (VPN, firewall rules)

---

## 💡 Tips

1. **Save IP Address**: Note your IP address or use Dynamic DNS
2. **Mobile Bookmark**: Bookmark the URL on your mobile for easy access
3. **Network Stability**: Use Ethernet for more stable IP address
4. **Battery Usage**: Close the app when not in use to save mobile battery
5. **Data Usage**: Monitor data if not on unlimited plan

---

## 🆘 Need Help?

1. Run diagnostics:
   ```powershell
   node get-network-info.js
   ```

2. Check server logs:
   - Backend: Look at terminal running `npm start`
   - Frontend: Look at terminal running `npm run dev`

3. Test API connection:
   ```powershell
   curl http://YOUR_IP:5001/health
   ```

4. Check mobile browser console:
   - Chrome Android: `chrome://inspect`
   - Safari iOS: Enable Web Inspector in Settings

---

## ✅ Verification Checklist

Before accessing from mobile:

- [ ] PC and mobile on same Wi-Fi network
- [ ] Firewall rules added for ports 3000 and 5001
- [ ] `node setup-network.js network` executed successfully
- [ ] Backend server running on port 5001
- [ ] Frontend server running on port 3000
- [ ] Backend shows network IP in console
- [ ] Can access `http://YOUR_IP:5001/health` from mobile browser
- [ ] Can access `http://YOUR_IP:3000` from mobile browser

---

## 📱 Mobile Browser Recommendations

- **Android**: Chrome, Firefox, Samsung Internet
- **iOS**: Safari, Chrome

All modern browsers support the app's features including:
- WebSocket for real-time updates
- File uploads
- Local storage for authentication
- Modern JavaScript features

---

## 🎉 Success!

Once configured, you can:
- ✅ Login from mobile device
- ✅ Upload and analyze financial documents
- ✅ View real-time updates
- ✅ Check credit scores
- ✅ Track EMIs
- ✅ Generate reports

Enjoy using Financial Analyzer on your mobile! 📱💰
