const fs = require('fs-extra');
const { execSync } = require('child_process');
const path = require('path');

// Get the project root directory
const projectRoot = path.join(__dirname, '..');

// Compile TypeScript (allow errors)
console.log('Compiling TypeScript...');
try {
  execSync('tsc', { stdio: 'inherit', cwd: projectRoot });
} catch (e) {
  console.warn('TypeScript compilation had warnings, continuing...');
}

// Copy public directory
if (fs.existsSync(path.join(projectRoot, 'public'))) {
  console.log('Copying public directory...');
  fs.copySync(
    path.join(projectRoot, 'public'),
    path.join(projectRoot, 'dist', 'public'),
    { overwrite: true }
  );
  console.log('Successfully copied public directory to dist');
} else {
  console.log('No public directory found, skipping copy');
}

// Copy data directory (for holidays.json, leavePolicy.json, etc.)
if (fs.existsSync(path.join(projectRoot, 'data'))) {
  console.log('Copying data directory...');
  fs.copySync(
    path.join(projectRoot, 'data'),
    path.join(projectRoot, 'dist', 'data'),
    { overwrite: true }
  );
  console.log('Successfully copied data directory to dist');
} else {
  console.log('No data directory found, skipping copy');
}
