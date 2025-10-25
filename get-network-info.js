const os = require('os');

function getNetworkInfo() {
  const interfaces = os.networkInterfaces();
  const networkIPs = [];
  
  console.log('\n🌐 Network Configuration for Mobile Access\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        networkIPs.push({
          interface: name,
          address: iface.address
        });
      }
    }
  }
  
  if (networkIPs.length === 0) {
    console.log('❌ No network interfaces found.');
    console.log('   Make sure you are connected to a Wi-Fi or Ethernet network.\n');
    return;
  }
  
  const selectedIP = networkIPs[0].address;
  
  console.log('📡 Available Network Interfaces:\n');
  networkIPs.forEach((info, idx) => {
    console.log(`   ${idx + 1}. ${info.interface}: ${info.address}`);
  });
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('🔧 Configuration Steps:\n');
  console.log('1. Create/Update .env file in frontend folder:');
  console.log(`   VITE_API_URL=http://${selectedIP}:5001/api\n`);
  
  console.log('2. Backend is already configured to accept network connections\n');
  
  console.log('3. Start both servers:');
  console.log('   Backend:  cd backend && npm start');
  console.log('   Frontend: cd frontend && npm run dev\n');
  
  console.log('4. Access from mobile phone (on same Wi-Fi):');
  console.log(`   🌐 http://${selectedIP}:3000\n`);
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('📱 Mobile Access URLs:\n');
  console.log(`   Frontend: http://${selectedIP}:3000`);
  console.log(`   Backend:  http://${selectedIP}:5001`);
  console.log(`   API:      http://${selectedIP}:5001/api\n`);
  
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('⚠️  Important Notes:\n');
  console.log('   • Ensure your PC and mobile are on the SAME Wi-Fi network');
  console.log('   • Check Windows Firewall allows Node.js connections');
  console.log('   • You may need to run: netsh advfirewall firewall add rule');
  console.log('     name="Node.js" dir=in action=allow protocol=TCP localport=3000,5001\n');
  
  return selectedIP;
}

getNetworkInfo();
