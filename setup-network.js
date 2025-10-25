const fs = require('fs');
const path = require('path');
const os = require('os');

function getNetworkIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const mode = process.argv[2] || 'local';
const envPath = path.join(__dirname, 'frontend', '.env');
const networkIP = getNetworkIP();

let envContent = '';

if (mode === 'network' || mode === 'mobile') {
  envContent = `# Frontend configuration
# Network/Mobile Access Mode - Access from any device on same network
VITE_API_URL=http://${networkIP}:5001/api

VITE_APP_NAME=Financial Analyzer

# Current Network IP: ${networkIP}
# Access from mobile: http://${networkIP}:3000
`;
  console.log('\n✅ Configured for NETWORK/MOBILE access\n');
  console.log('📱 Mobile Access URL: http://' + networkIP + ':3000');
  console.log('🔧 API URL: http://' + networkIP + ':5001/api\n');
  console.log('⚠️  Make sure:');
  console.log('   1. PC and mobile are on SAME Wi-Fi network');
  console.log('   2. Windows Firewall allows Node.js (ports 3000, 5001)');
  console.log('   3. Restart frontend after this change: cd frontend && npm run dev\n');
} else {
  envContent = `# Frontend configuration
# Local Development Mode - Access only from this PC
VITE_API_URL=http://localhost:5001/api

VITE_APP_NAME=Financial Analyzer

# To enable mobile access, run: node setup-network.js network
`;
  console.log('\n✅ Configured for LOCAL access\n');
  console.log('🏠 Local URL: http://localhost:3000');
  console.log('🔧 API URL: http://localhost:5001/api\n');
  console.log('💡 To enable mobile access, run: node setup-network.js network\n');
}

fs.writeFileSync(envPath, envContent);
console.log('✅ Configuration saved to frontend/.env\n');
