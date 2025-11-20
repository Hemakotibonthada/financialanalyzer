const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Starting deployment...\n');

// Change to project directory
const projectRoot = 'c:\\Users\\v-hbonthada\\WorkSpace\\Financial_Analyzer';
process.chdir(projectRoot);

console.log('Project directory:', process.cwd());

// Execute the deployment script
try {
  console.log('\nExecuting deploy-and-configure.js...\n');
  execSync('node deploy-and-configure.js', { stdio: 'inherit', cwd: projectRoot });
  console.log('\n✅ Deployment script completed successfully!');
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
