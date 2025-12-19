const fs = require('fs-extra');
const { execSync } = require('child_process');

// Compile TypeScript
console.log('Compiling TypeScript...');
execSync('tsc', { stdio: 'inherit' });

// Copy public directory
if (fs.existsSync('public')) {
  console.log('Copying public directory...');
  fs.copySync('public', 'dist/public', { overwrite: true });
  console.log('Successfully copied public directory to dist');
} else {
  console.log('No public directory found, skipping copy');
}