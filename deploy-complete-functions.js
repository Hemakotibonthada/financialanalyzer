#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const backendPath = path.join(__dirname, 'backend');
const functionsPath = path.join(__dirname, 'functions');

console.log('🚀 Deploying complete backend to Firebase Functions...\n');
console.log(`Backend path: ${backendPath}`);
console.log(`Functions path: ${functionsPath}\n`);

// Directories to copy
const directoriesToCopy = [
  'config',
  'controllers',
  'middleware',
  'models',
  'routes',
  'services',
  'utils'
];

// Function to copy directory recursively
function copyDirectory(source, destination) {
  try {
    if (!fs.existsSync(destination)) {
      fs.mkdirSync(destination, { recursive: true });
    }

    const files = fs.readdirSync(source);
    let count = 0;

    files.forEach(file => {
      try {
        const sourcePath = path.join(source, file);
        const destPath = path.join(destination, file);
        const stat = fs.statSync(sourcePath);

        if (stat.isDirectory()) {
          count += copyDirectory(sourcePath, destPath);
        } else if (file.endsWith('.js')) {
          fs.copyFileSync(sourcePath, destPath);
          count++;
          console.log(`✅ ${path.relative(backendPath, sourcePath)}`);
        }
      } catch (fileError) {
        console.error(`⚠️  Error copying ${file}: ${fileError.message}`);
      }
    });

    return count;
  } catch (dirError) {
    console.error(`⚠️  Error reading directory ${source}: ${dirError.message}`);
    return 0;
  }
}

// Copy all directories
let totalFiles = 0;
directoriesToCopy.forEach(dir => {
  const sourcePath = path.join(backendPath, dir);
  const destPath = path.join(functionsPath, dir);

  if (fs.existsSync(sourcePath)) {
    console.log(`\n📁 Copying ${dir}/...`);
    const count = copyDirectory(sourcePath, destPath);
    totalFiles += count;
    console.log(`   Copied ${count} files`);
  } else {
    console.log(`⚠️  ${dir}/ not found, skipping...`);
  }
});

console.log(`\n✅ Successfully copied ${totalFiles} files!\n`);

// Copy .env file if it doesn't exist in functions
const backendEnv = path.join(backendPath, '.env');
const functionsEnv = path.join(functionsPath, '.env');

try {
  if (fs.existsSync(backendEnv) && !fs.existsSync(functionsEnv)) {
    fs.copyFileSync(backendEnv, functionsEnv);
    console.log('✅ Copied .env file\n');
  }
} catch (envError) {
  console.log('⚠️  Could not copy .env file (this is optional)\n');
}

console.log('📝 Summary:');
console.log(`   - ${totalFiles} backend files copied to functions/`);
console.log(`   - Backend structure preserved`);
console.log(`   - Ready for Firebase deployment\n`);

console.log('🎯 Next steps:');
console.log('   1. cd functions');
console.log('   2. npm install');
console.log('   3. Configure environment variables');
console.log('   4. Test locally: firebase emulators:start');
console.log('   5. Deploy: firebase deploy --only functions\n');

console.log('💡 Note: Make sure MongoDB connection string is configured for production!');
console.log('💡 For MongoDB Atlas: Use connection string in Firebase config');
console.log('💡 firebase functions:config:set mongodb.uri="your_connection_string"\n');
