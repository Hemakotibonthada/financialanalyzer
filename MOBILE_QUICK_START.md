# 🚀 Quick Start - Mobile Access

Access the Financial Analyzer from your mobile phone on the same network!

## ⚡ One-Click Setup (Windows)

### Option 1: Automatic Setup (Recommended)

Run PowerShell **as Administrator** and execute:

```powershell
.\setup-mobile-access.ps1
```

This will automatically:
- ✅ Configure Windows Firewall
- ✅ Detect your network IP
- ✅ Configure the application
- ✅ Display mobile access URLs

### Option 2: Manual Setup

```powershell
# 1. Configure for network access
node setup-network.js network

# 2. Add firewall rules (as Administrator)
netsh advfirewall firewall add rule name="Node.js Port 3000" dir=in action=allow protocol=TCP localport=3000
netsh advfirewall firewall add rule name="Node.js Port 5001" dir=in action=allow protocol=TCP localport=5001

# 3. Start servers
cd backend && npm start    # Terminal 1
cd frontend && npm run dev # Terminal 2
```

## 📱 Access from Mobile

1. **Get your PC's IP address** (displayed after running setup)
   - Example: `172.29.11.204`

2. **On your mobile browser**, navigate to:
   ```
   http://YOUR_IP:3000
   ```

3. **Login** with your credentials

## 🔄 Switch Modes

**Enable Mobile Access:**
```powershell
node setup-network.js network
cd frontend && npm run dev  # Restart frontend
```

**Back to Local Only:**
```powershell
node setup-network.js local
cd frontend && npm run dev  # Restart frontend
```

## ✅ Checklist

Before accessing from mobile:

- [ ] Run `setup-mobile-access.ps1` as Administrator
- [ ] PC and mobile connected to **same Wi-Fi network**
- [ ] Backend server running (`cd backend && npm start`)
- [ ] Frontend server running (`cd frontend && npm run dev`)
- [ ] Test URL: `http://YOUR_IP:3000` in mobile browser

## 🔍 Troubleshooting

**Can't connect from mobile?**

1. **Check network:** Verify same Wi-Fi network
2. **Check firewall:** Run `setup-mobile-access.ps1` again
3. **Check IP:** Run `node get-network-info.js`
4. **Test API:** Visit `http://YOUR_IP:5001/health` in mobile browser

**IP Address changed?**

```powershell
node setup-network.js network
cd frontend && npm run dev  # Restart
```

## 📚 Full Documentation

See [MOBILE_ACCESS_GUIDE.md](./MOBILE_ACCESS_GUIDE.md) for complete documentation including:
- Detailed troubleshooting
- Security considerations
- Network architecture
- Manual configuration
- Testing procedures

## 🆘 Quick Help

```powershell
# Get network information
node get-network-info.js

# Check current configuration
cat frontend/.env

# Test backend connection
curl http://YOUR_IP:5001/health
```

---

**Current Configuration:**
- Network IP: `172.29.11.204`
- Frontend URL: `http://172.29.11.204:3000`
- Backend API: `http://172.29.11.204:5001/api`

**Note:** IP address may change after network reconnection. Run `node setup-network.js network` again if needed.
