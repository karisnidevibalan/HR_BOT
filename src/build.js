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
if (fs.existsSync('public')) {
  console.log('Copying public directory...');
  fs.copySync('public', 'dist/public', { overwrite: true });
  console.log('Successfully copied public directory to dist');
} else {
  console.log('No public directory found, skipping copy');
}

// Copy data directory (for holidays.json, leavePolicy.json, etc.)
if (fs.existsSync('data')) {
  console.log('Copying data directory...');
  fs.copySync('data', 'dist/data', { overwrite: true });
  console.log('Successfully copied data directory to dist');
} else {
  console.log('No data directory found, skipping copy');
}
