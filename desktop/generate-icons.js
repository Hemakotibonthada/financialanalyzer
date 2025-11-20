const fs = require('fs');
const path = require('path');

// SVG icon template - simple financial icon
const svgIcon = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="256" height="256" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
  <!-- Background circle -->
  <circle cx="128" cy="128" r="120" fill="#4A90E2" stroke="#2C5F8D" stroke-width="4"/>
  
  <!-- Dollar sign -->
  <g fill="#FFFFFF" stroke="#FFFFFF" stroke-width="2">
    <!-- Top curve -->
    <path d="M 128 60 L 128 50" stroke-linecap="round"/>
    <path d="M 110 70 Q 110 60, 128 60 L 146 60 Q 155 60, 155 70 Q 155 80, 146 85 L 110 95 Q 101 98, 101 108 Q 101 118, 110 121 L 128 125" 
          fill="none" stroke-width="8" stroke-linecap="round"/>
    
    <!-- Bottom curve -->
    <path d="M 128 125 L 146 130 Q 155 133, 155 143 Q 155 153, 146 156 L 128 160 Q 110 160, 110 150" 
          fill="none" stroke-width="8" stroke-linecap="round"/>
    <path d="M 128 160 L 128 170" stroke-linecap="round"/>
  </g>
  
  <!-- Chart/Graph decoration -->
  <g fill="none" stroke="#FFD700" stroke-width="3" opacity="0.8">
    <polyline points="40,180 70,160 100,170 130,140 160,155 190,130 220,145" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="70" cy="160" r="4" fill="#FFD700"/>
    <circle cx="100" cy="170" r="4" fill="#FFD700"/>
    <circle cx="130" cy="140" r="4" fill="#FFD700"/>
    <circle cx="160" cy="155" r="4" fill="#FFD700"/>
    <circle cx="190" cy="130" r="4" fill="#FFD700"/>
  </g>
  
  <!-- Ring decoration -->
  <circle cx="128" cy="128" r="100" fill="none" stroke="#FFFFFF" stroke-width="2" opacity="0.3"/>
</svg>`;

// Tray icon SVG - simplified smaller version
const trayIconSvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="32" height="32" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
  <circle cx="16" cy="16" r="14" fill="#4A90E2"/>
  <text x="16" y="22" font-family="Arial" font-size="20" font-weight="bold" fill="#FFFFFF" text-anchor="middle">$</text>
</svg>`;

// Write SVG files
const assetsDir = path.join(__dirname, 'assets');

// Ensure assets directory exists
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir, { recursive: true });
}

// Write icon files
fs.writeFileSync(path.join(assetsDir, 'icon.svg'), svgIcon);
fs.writeFileSync(path.join(assetsDir, 'tray-icon.svg'), trayIconSvg);

console.log('✅ SVG icons created successfully!');
console.log('📁 Location: desktop/assets/');
console.log('');
console.log('📝 Next steps:');
console.log('1. Convert SVG to ICO/PNG for production:');
console.log('   - Use online converters: https://convertio.co/svg-ico/');
console.log('   - Or install: npm install -g electron-icon-builder');
console.log('   - Then run: electron-icon-builder --input=./assets/icon.svg --output=./assets');
console.log('');
console.log('2. For now, we can test with PNG:');
console.log('   - The build will work with SVG in development');
console.log('   - Convert to ICO before final distribution');
