const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const assetsDir = path.join(__dirname, 'assets');

async function createIcons() {
  try {
    // Create main app icon (256x256) with blue background and $ symbol
    const svgIcon = Buffer.from(`
      <svg width="256" height="256" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#4A90E2;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#2C5F8D;stop-opacity:1" />
          </linearGradient>
        </defs>
        <circle cx="128" cy="128" r="120" fill="url(#grad)" stroke="#1a4d7a" stroke-width="4"/>
        <text x="128" y="180" font-family="Arial, sans-serif" font-size="140" font-weight="bold" 
              fill="#ffffff" text-anchor="middle" stroke="#ffffff" stroke-width="2">$</text>
        <circle cx="128" cy="128" r="100" fill="none" stroke="#ffffff" stroke-width="2" opacity="0.3"/>
      </svg>
    `);

    // Create tray icon (32x32) - smaller version
    const svgTray = Buffer.from(`
      <svg width="32" height="32" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="15" fill="#4A90E2" stroke="#2C5F8D" stroke-width="1"/>
        <text x="16" y="24" font-family="Arial" font-size="22" font-weight="bold" 
              fill="#ffffff" text-anchor="middle">$</text>
      </svg>
    `);

    // Generate icon.png (256x256)
    await sharp(svgIcon)
      .resize(256, 256)
      .png()
      .toFile(path.join(assetsDir, 'icon.png'));

    console.log('✅ Created icon.png (256x256)');

    // Generate tray-icon.png (32x32)
    await sharp(svgTray)
      .resize(32, 32)
      .png()
      .toFile(path.join(assetsDir, 'tray-icon.png'));

    console.log('✅ Created tray-icon.png (32x32)');

    // Generate multiple sizes for ICO (Windows)
    await sharp(svgIcon).resize(16, 16).png().toFile(path.join(assetsDir, 'icon-16.png'));
    await sharp(svgIcon).resize(32, 32).png().toFile(path.join(assetsDir, 'icon-32.png'));
    await sharp(svgIcon).resize(48, 48).png().toFile(path.join(assetsDir, 'icon-48.png'));
    await sharp(svgIcon).resize(64, 64).png().toFile(path.join(assetsDir, 'icon-64.png'));
    await sharp(svgIcon).resize(128, 128).png().toFile(path.join(assetsDir, 'icon-128.png'));
    await sharp(svgIcon).resize(256, 256).png().toFile(path.join(assetsDir, 'icon-256.png'));

    console.log('✅ Created multi-size icons (16-256px)');
    
    // Note: For proper ICO file, you'd need a library like png-to-ico
    // For now, we'll just use PNG in the build (electron-builder can handle it)
    console.log('');
    console.log('📦 Icons ready for Electron!');
    console.log('   Note: electron-builder will automatically convert PNG to ICO');
    console.log('');
    console.log('🚀 Next step: npm start (to test) or npm run dist (to build installer)');

  } catch (error) {
    console.error('❌ Error creating icons:', error.message);
    console.log('');
    console.log('💡 Tip: If Sharp fails, you can:');
    console.log('   1. Download an icon online and save as icon.png');
    console.log('   2. Use online converter: https://www.icoconverter.com/');
  }
}

createIcons();
