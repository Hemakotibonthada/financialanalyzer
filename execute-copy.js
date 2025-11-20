const { exec } = require('child_process');
const path = require('path');

const projectRoot = __dirname;
const batchFile = path.join(projectRoot, 'copy-backend-to-functions.bat');

console.log('🚀 Starting backend to functions deployment...\n');
console.log(`📁 Project root: ${projectRoot}`);
console.log(`📄 Batch file: ${batchFile}\n`);

// Execute the batch file using cmd
exec(`cmd.exe /c "${batchFile}"`, { cwd: projectRoot }, (error, stdout, stderr) => {
  if (error) {
    console.error(`❌ Error executing batch file: ${error.message}`);
    process.exit(1);
  }
  
  if (stderr) {
    console.error(`⚠️  Stderr: ${stderr}`);
  }
  
  console.log(stdout);
  console.log('\n✅ Files copied successfully!');
  console.log('\n📝 Next steps:');
  console.log('   1. cd functions');
  console.log('   2. npm install');
  console.log('   3. Set up environment variables');
  console.log('   4. firebase emulators:start (to test)');
  console.log('   5. firebase deploy --only functions\n');
});
