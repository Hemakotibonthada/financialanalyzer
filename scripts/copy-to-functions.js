const fs = require('fs');
const path = require('path');

// Directories to copy
const directories = [
  'config',
  'controllers',
  'middleware',
  'models',
  'routes',
  'services',
  'utils'
];

const backendPath = path.join(__dirname, 'backend');
const functionsPath = path.join(__dirname, 'functions');

// Ensure functions directory exists
if (!fs.existsSync(functionsPath)) {
  fs.mkdirSync(functionsPath, { recursive: true });
}

console.log('📋 Copying backend files to functions directory...\n');

// Copy each directory
directories.forEach(dir => {
  const sourcePath = path.join(backendPath, dir);
  const targetPath = path.join(functionsPath, dir);
  
  if (fs.existsSync(sourcePath)) {
    // Create target directory if it doesn't exist
    if (!fs.existsSync(targetPath)) {
      fs.mkdirSync(targetPath, { recursive: true });
    }
    
    // Copy all files
    const files = fs.readdirSync(sourcePath);
    files.forEach(file => {
      if (file.endsWith('.js')) {
        const sourceFile = path.join(sourcePath, file);
        const targetFile = path.join(targetPath, file);
        fs.copyFileSync(sourceFile, targetFile);
        console.log(`✅ Copied ${dir}/${file}`);
      }
    });
  }
});

console.log('\n✅ All files copied successfully!');
console.log('\n📝 Next steps:');
console.log('1. Review functions/index.js to ensure all routes are imported');
console.log('2. Update database configuration for MongoDB Atlas');
console.log('3. Test functions locally: firebase emulators:start');
console.log('4. Deploy: firebase deploy --only functions');
