const fs = require('fs');
const path = require('path');

// Read version from package.json (source of truth)
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageData = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const version = packageData.version;

if (!version) {
  console.error('Error: Version not found in package.json');
  process.exit(1);
}

// Update version.json to match package.json
const versionJsonPath = path.join(__dirname, '..', 'public', 'version.json');
const versionJsonData = { version };
fs.writeFileSync(versionJsonPath, JSON.stringify(versionJsonData, null, 2) + '\n', 'utf8');
console.log(`✓ Synced version.json to ${version} from package.json`);

// Read service worker template
const swTemplatePath = path.join(__dirname, '..', 'public', 'service-worker.js');
let swContent = fs.readFileSync(swTemplatePath, 'utf8');

// Replace version in CACHE_NAME
// Handles both placeholder (__VERSION__) and existing version patterns
// Pattern: 'cbc-app-v' followed by version or placeholder
const cacheNamePattern = /(const CACHE_NAME = ['"]cbc-app-v)(?:__VERSION__|[\d.]+)(['"];)/;
if (cacheNamePattern.test(swContent)) {
  swContent = swContent.replace(cacheNamePattern, `$1${version}$2`);
} else {
  // Fallback: replace __VERSION__ placeholder if pattern doesn't match
  swContent = swContent.replace(/__VERSION__/g, version);
}

// Write modified service worker back to public (will be copied to build by react-scripts)
fs.writeFileSync(swTemplatePath, swContent, 'utf8');

console.log(`✓ Injected version ${version} into service worker`);

