const fs = require('fs-extra');
const { execSync } = require('child_process');

// Compile TypeScript (allow errors)
console.log('Compiling TypeScript...');
try {
  execSync('tsc', { stdio: 'inherit' });
} catch (e) {
  console.warn('TypeScript compilation had warnings, continuing...');
}

// Copy public directory
// Copy data directory (for holidays.json, leavePolicy.json, etc.)
if (fs.existsSync('data')) {
  console.log('Copying data directory...');
  fs.copySync('data', 'dist/data', { overwrite: true });
  console.log('Successfully copied data directory to dist');
}

