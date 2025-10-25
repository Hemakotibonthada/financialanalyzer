const http = require('http');
const os = require('os');

console.log('\n🔍 Mobile Access Readiness Check\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// Get Network IP
function getNetworkIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return null;
}

const networkIP = getNetworkIP();

if (!networkIP) {
  console.log('❌ No network connection detected');
  console.log('   Please connect to Wi-Fi or Ethernet\n');
  process.exit(1);
}

console.log(`✅ Network IP: ${networkIP}\n`);

// Check if Backend is running
console.log('🔍 Checking Backend (Port 5001)...');
const backendOptions = {
  hostname: 'localhost',
  port: 5001,
  path: '/health',
  method: 'GET',
  timeout: 3000
};

const backendReq = http.request(backendOptions, (res) => {
  if (res.statusCode === 200) {
    console.log('✅ Backend is running\n');
  } else {
    console.log(`⚠️  Backend returned status ${res.statusCode}\n`);
  }
  
  checkFrontend();
});

backendReq.on('error', (err) => {
  console.log('❌ Backend is NOT running');
  console.log('   Start it with: cd backend && npm start\n');
  checkFrontend();
});

backendReq.on('timeout', () => {
  backendReq.destroy();
  console.log('❌ Backend connection timeout\n');
  checkFrontend();
});

backendReq.end();

// Check if Frontend is running
function checkFrontend() {
  console.log('🔍 Checking Frontend (Port 3000)...');
  const frontendOptions = {
    hostname: 'localhost',
    port: 3000,
    path: '/',
    method: 'GET',
    timeout: 3000
  };

  const frontendReq = http.request(frontendOptions, (res) => {
    if (res.statusCode === 200 || res.statusCode === 304) {
      console.log('✅ Frontend is running\n');
    } else {
      console.log(`⚠️  Frontend returned status ${res.statusCode}\n`);
    }
    
    displayResults();
  });

  frontendReq.on('error', (err) => {
    console.log('❌ Frontend is NOT running');
    console.log('   Start it with: cd frontend && npm run dev\n');
    displayResults();
  });

  frontendReq.on('timeout', () => {
    frontendReq.destroy();
    console.log('❌ Frontend connection timeout\n');
    displayResults();
  });

  frontendReq.end();
}

function displayResults() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('📱 Mobile Access Information:\n');
  console.log(`   Frontend URL: http://${networkIP}:3000`);
  console.log(`   Backend URL:  http://${networkIP}:5001`);
  console.log(`   API URL:      http://${networkIP}:5001/api\n`);
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('📋 Checklist:\n');
  
  const fs = require('fs');
  const path = require('path');
  
  // Check .env file
  const envPath = path.join(__dirname, 'frontend', '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    if (envContent.includes(networkIP)) {
      console.log('   ✅ Frontend .env configured with network IP');
    } else {
      console.log('   ⚠️  Frontend .env may need update');
      console.log(`      Run: node setup-network.js network`);
    }
  } else {
    console.log('   ❌ Frontend .env file not found');
    console.log(`      Run: node setup-network.js network`);
  }
  
  console.log('   ⚠️  Firewall: Ensure ports 3000 & 5001 are allowed');
  console.log('   ⚠️  Network: PC and mobile must be on same Wi-Fi\n');
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('🚀 Quick Commands:\n');
  console.log('   Configure Firewall: .\\setup-mobile-access.ps1');
  console.log('   Start Backend:      cd backend && npm start');
  console.log('   Start Frontend:     cd frontend && npm run dev');
  console.log('   Get Network Info:   node get-network-info.js\n');
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}
