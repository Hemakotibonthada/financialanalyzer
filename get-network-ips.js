#!/usr/bin/env node

const os = require('os');

function getNetworkIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push({ name, address: iface.address });
      }
    }
  }
  return ips;
}

console.log('\n🌐 Network Information for Mobile Access:');
console.log('==========================================');

const networkIPs = getNetworkIPs();

if (networkIPs.length > 0) {
  console.log('\n📱 Access from mobile device using these URLs:');
  networkIPs.forEach(({ name, address }) => {
    console.log(`\n${name.toUpperCase()}:`);
    console.log(`  Backend:  http://${address}:5000`);
    console.log(`  Frontend: http://${address}:3000`);
  });
  
  console.log('\n📋 Setup Instructions:');
  console.log('1. Make sure your mobile device is on the same WiFi network');
  console.log('2. Start the backend: npm run dev (in backend folder)');
  console.log('3. Start the frontend: npm run dev (in frontend folder)');
  console.log('4. Open the frontend URL on your mobile browser');
  
} else {
  console.log('❌ No network interfaces found');
  console.log('Make sure you are connected to WiFi or ethernet');
}

console.log('\n🔒 Security Note:');
console.log('These addresses are only accessible on your local network.');
console.log('For internet access, you would need to configure port forwarding.');

console.log('\n');