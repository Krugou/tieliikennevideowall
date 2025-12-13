const fs = require('fs');
const path = require('path');

const distDir = path.resolve(__dirname, '..', 'dist');
const indexFile = path.join(distDir, 'index.html');
const fallbackFile = path.join(distDir, '404.html');

if (!fs.existsSync(distDir)) {
  console.warn('dist directory not found, skipping copy to 404.html');
  process.exit(0);
}

try {
  const data = fs.readFileSync(indexFile);
  fs.writeFileSync(fallbackFile, data);
  console.info('Copied dist/index.html -> dist/404.html');
} catch (err) {
  console.error('Failed to copy index.html to 404.html', err);
  process.exit(1);
}
