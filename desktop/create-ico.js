const { default: pngToIco } = require('png-to-ico');
const fs = require('fs');
const path = require('path');

async function convertToIco() {
  try {
    const iconPath = path.join(__dirname, 'assets', 'icon-256.png');
    
    // Convert PNG to ICO with multiple sizes
    const icoBuffer = await pngToIco([
      path.join(__dirname, 'assets', 'icon-16.png'),
      path.join(__dirname, 'assets', 'icon-32.png'),
      path.join(__dirname, 'assets', 'icon-48.png'),
      path.join(__dirname, 'assets', 'icon-64.png'),
      path.join(__dirname, 'assets', 'icon-128.png'),
      path.join(__dirname, 'assets', 'icon-256.png')
    ]);
    
    // Save ICO file
    fs.writeFileSync(path.join(__dirname, 'assets', 'icon.ico'), icoBuffer);
    
    console.log('✅ Successfully created icon.ico with multiple sizes!');
    console.log('   Sizes: 16x16, 32x32, 48x48, 64x64, 128x128, 256x256');
    console.log('');
    console.log('🚀 Now you can build the installer:');
    console.log('   npm run dist');
  } catch (error) {
    console.error('❌ Error creating ICO file:', error.message);
  }
}

convertToIco();
