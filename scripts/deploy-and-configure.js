#!/usr/bin/env node

/**
 * Complete Backend to Firebase Functions Deployment Script
 * This script automates the entire deployment process
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const backendPath = path.join(__dirname, 'backend');
const functionsPath = path.join(__dirname, 'functions');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function header(message) {
  console.log('\n' + '='.repeat(60));
  log(message, 'bright');
  console.log('='.repeat(60) + '\n');
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function error(message) {
  log(`❌ ${message}`, 'red');
}

function warning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function info(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

// Check if directory exists
function checkDirectory(dirPath, name) {
  if (fs.existsSync(dirPath)) {
    success(`${name} directory found`);
    return true;
  } else {
    error(`${name} directory not found at: ${dirPath}`);
    return false;
  }
}

// Copy directory recursively
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
        }
      } catch (fileError) {
        warning(`Could not copy ${file}: ${fileError.message}`);
      }
    });

    return count;
  } catch (dirError) {
    error(`Error reading directory ${source}: ${dirError.message}`);
    return 0;
  }
}

// Main deployment process
async function deploy() {
  header('🚀 Complete Backend to Firebase Functions Deployment');
  
  info('This script will:');
  console.log('  1. Copy all backend files to functions directory');
  console.log('  2. Verify all necessary files are present');
  console.log('  3. Install dependencies');
  console.log('  4. Guide you through configuration');
  console.log('  5. Prepare for deployment\n');

  // Step 1: Verify directories
  header('Step 1: Verifying Directories');
  
  if (!checkDirectory(backendPath, 'Backend')) {
    error('Backend directory not found. Exiting...');
    process.exit(1);
  }
  
  if (!checkDirectory(functionsPath, 'Functions')) {
    info('Creating functions directory...');
    fs.mkdirSync(functionsPath, { recursive: true });
    success('Functions directory created');
  }

  // Step 2: Copy files
  header('Step 2: Copying Backend Files to Functions');
  
  const directoriesToCopy = [
    'config',
    'controllers',
    'middleware',
    'models',
    'routes',
    'services',
    'utils'
  ];

  let totalFiles = 0;
  const copyResults = {};

  directoriesToCopy.forEach(dir => {
    const sourcePath = path.join(backendPath, dir);
    const destPath = path.join(functionsPath, dir);

    if (fs.existsSync(sourcePath)) {
      info(`Copying ${dir}/...`);
      const count = copyDirectory(sourcePath, destPath);
      copyResults[dir] = count;
      totalFiles += count;
      success(`Copied ${count} files from ${dir}/`);
    } else {
      warning(`${dir}/ not found, skipping...`);
      copyResults[dir] = 0;
    }
  });

  // Step 3: Summary
  header('Step 3: Copy Summary');
  
  console.log('Files copied per directory:');
  Object.entries(copyResults).forEach(([dir, count]) => {
    console.log(`  ${dir.padEnd(15)} : ${count} files`);
  });
  console.log(`  ${'TOTAL'.padEnd(15)} : ${totalFiles} files\n`);

  if (totalFiles === 0) {
    error('No files were copied. Please check your backend directory structure.');
    process.exit(1);
  }

  success(`Successfully copied ${totalFiles} backend files!`);

  // Step 4: Verify critical files
  header('Step 4: Verifying Critical Files');
  
  const criticalFiles = [
    'index.js',
    'package.json',
    'middleware/auth.js'
  ];

  let allCriticalFilesPresent = true;
  criticalFiles.forEach(file => {
    const filePath = path.join(functionsPath, file);
    if (fs.existsSync(filePath)) {
      success(`${file} is present`);
    } else {
      error(`${file} is missing!`);
      allCriticalFilesPresent = false;
    }
  });

  if (!allCriticalFilesPresent) {
    error('Some critical files are missing. Please review the setup.');
    process.exit(1);
  }

  // Step 5: Check dependencies
  header('Step 5: Checking Dependencies');
  
  const packageJsonPath = path.join(functionsPath, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    success('package.json found');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const depCount = Object.keys(packageJson.dependencies || {}).length;
    info(`${depCount} dependencies listed in package.json`);
  } else {
    error('package.json not found!');
  }

  // Step 6: Install dependencies
  header('Step 6: Installing Dependencies');
  
  try {
    info('Running npm install in functions directory...');
    info('This may take a few minutes...\n');
    
    process.chdir(functionsPath);
    execSync('npm install', { stdio: 'inherit' });
    
    success('Dependencies installed successfully!');
  } catch (installError) {
    error('Failed to install dependencies');
    warning('You may need to run: cd functions && npm install manually');
  }

  // Step 7: Configuration guide
  header('Step 7: Configuration Requirements');
  
  info('You need to configure the following in Firebase:');
  console.log('\n1. MongoDB Connection:');
  console.log('   firebase functions:config:set mongodb.uri="your_mongodb_atlas_connection_string"');
  
  console.log('\n2. JWT Secrets:');
  console.log('   firebase functions:config:set jwt.secret="your_jwt_secret"');
  console.log('   firebase functions:config:set jwt.refresh_secret="your_refresh_secret"');
  
  console.log('\n3. Optional - Google OAuth:');
  console.log('   firebase functions:config:set google.client_id="your_client_id"');
  console.log('   firebase functions:config:set google.client_secret="your_client_secret"');

  // Step 8: Next steps
  header('✅ Deployment Preparation Complete!');
  
  console.log('📋 Next Steps:\n');
  console.log('1. Configure environment variables (see above)');
  console.log('2. Test locally (optional):');
  console.log('   firebase emulators:start\n');
  console.log('3. Deploy to Firebase:');
  console.log('   firebase deploy --only functions\n');
  console.log('4. Test your deployment:');
  console.log('   curl https://asia-south1-finserveassist.cloudfunctions.net/api/health\n');

  info('📖 For detailed instructions, see: COMPLETE_DEPLOYMENT_GUIDE.md');
  
  header('🎉 Ready for Deployment!');
  
  console.log('All backend files have been copied to functions directory.');
  console.log('Your application is ready to be deployed to Firebase Functions.');
  console.log('\nRun: firebase deploy --only functions\n');
}

// Run the deployment
deploy().catch(error => {
  console.error('\n');
  error(`Deployment failed: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
});
