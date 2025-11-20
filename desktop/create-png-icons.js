const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

// Create a simple icon using Canvas
function createIcon(size, outputPath) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background circle
  ctx.fillStyle = '#4A90E2';
  ctx.beginPath();
  ctx.arc(size/2, size/2, size/2 - 10, 0, Math.PI * 2);
  ctx.fill();

  // Border
  ctx.strokeStyle = '#2C5F8D';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Dollar sign
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold ${size * 0.6}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('$', size/2, size/2);

  // Chart line
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 3;
  ctx.beginPath();
  const startX = size * 0.2;
  const startY = size * 0.75;
  ctx.moveTo(startX, startY);
  ctx.lineTo(startX + size * 0.15, startY - size * 0.08);
  ctx.lineTo(startX + size * 0.3, startY - size * 0.05);
  ctx.lineTo(startX + size * 0.45, startY - size * 0.15);
  ctx.lineTo(startX + size * 0.6, startY - size * 0.1);
  ctx.stroke();

  // Save as PNG
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);
}

const assetsDir = path.join(__dirname, 'assets');

try {
  // Create different sized PNGs
  createIcon(256, path.join(assetsDir, 'icon-256.png'));
  createIcon(128, path.join(assetsDir, 'icon-128.png'));
  createIcon(64, path.join(assetsDir, 'icon-64.png'));
  createIcon(32, path.join(assetsDir, 'icon-32.png'));
  createIcon(16, path.join(assetsDir, 'tray-icon-16.png'));

  // Copy main icon
  fs.copyFileSync(
    path.join(assetsDir, 'icon-256.png'),
    path.join(assetsDir, 'icon.png')
  );

  // Copy tray icon
  fs.copyFileSync(
    path.join(assetsDir, 'icon-32.png'),
    path.join(assetsDir, 'tray-icon.png')
  );

  console.log('✅ PNG icons created successfully!');
  console.log('   - icon.png (256x256)');
  console.log('   - tray-icon.png (32x32)');
  console.log('   - Various sizes for multi-resolution support');
} catch (error) {
  if (error.code === 'MODULE_NOT_FOUND' && error.message.includes('canvas')) {
    console.log('⚠️  Canvas module not available.');
    console.log('Creating basic fallback icons...');
    
    // Fallback: Create a simple colored square as PNG
    // This is a minimal valid PNG file (1x1 blue pixel)
    const bluePNG = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
      0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0x60, 0xA0, 0xFF, 0x00,
      0x00, 0x00, 0x03, 0x00, 0x01, 0x4E, 0x4D, 0x8F, 0x1E, 0x00, 0x00, 0x00,
      0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ]);
    
    fs.writeFileSync(path.join(assetsDir, 'icon.png'), bluePNG);
    fs.writeFileSync(path.join(assetsDir, 'tray-icon.png'), bluePNG);
    
    console.log('✅ Placeholder icons created!');
    console.log('');
    console.log('📝 To create proper icons:');
    console.log('1. Use an online tool: https://www.icoconverter.com/');
    console.log('2. Upload a 256x256 PNG image');
    console.log('3. Download icon.ico and place in desktop/assets/');
    console.log('4. Create tray-icon.png (32x32) for system tray');
  } else {
    throw error;
  }
}
