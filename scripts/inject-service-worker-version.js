const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

// Read version from package.json (source of truth)
const packageJsonPath = path.join(root, 'package.json');
const packageData = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const version = packageData.version;

if (!version) {
  console.error('Error: Version not found in package.json');
  process.exit(1);
}

const versionJsonPath = path.join(root, 'public', 'version.json');
let previousIosBuild;
if (fs.existsSync(versionJsonPath)) {
  try {
    const prev = JSON.parse(fs.readFileSync(versionJsonPath, 'utf8'));
    if (prev.iosBuild != null && prev.iosBuild !== '') {
      previousIosBuild = String(prev.iosBuild);
    }
  } catch {
    // ignore corrupt version.json
  }
}

const versionJsonData = { version };
if (previousIosBuild != null) {
  versionJsonData.iosBuild = previousIosBuild;
}
fs.writeFileSync(versionJsonPath, JSON.stringify(versionJsonData, null, 2) + '\n', 'utf8');
console.log(`✓ Synced version.json to ${version} from package.json`);

/** CFBundleVersion when iosBuild is omitted — stable per marketing version (bump iosBuild in version.json to resubmit same version). */
function defaultIosBuildFromSemver(v) {
  const m = String(v).match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!m) return '1';
  const major = parseInt(m[1], 10);
  const minor = parseInt(m[2], 10);
  const patch = parseInt(m[3], 10);
  return String(major * 10000 + minor * 100 + patch);
}

function syncIosXcodeVersions(marketingVersion, currentProjectVersion) {
  const pbxprojPath = path.join(
    root,
    'ios',
    'App',
    'App.xcodeproj',
    'project.pbxproj'
  );
  if (!fs.existsSync(pbxprojPath)) {
    console.warn('⚠ Skipping iOS version sync (project.pbxproj not found)');
    return;
  }
  let content = fs.readFileSync(pbxprojPath, 'utf8');
  const marketingPbx =
    /^[\d.]+$/.test(String(marketingVersion)) ? marketingVersion : `"${String(marketingVersion).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
  const buildPbx = /^[\d]+$/.test(String(currentProjectVersion))
    ? currentProjectVersion
    : `"${String(currentProjectVersion).replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

  const next = content
    .replace(/MARKETING_VERSION = [^;\n]+;/g, `MARKETING_VERSION = ${marketingPbx};`)
    .replace(/CURRENT_PROJECT_VERSION = [^;\n]+;/g, `CURRENT_PROJECT_VERSION = ${buildPbx};`);

  if (next === content) {
    console.warn('⚠ iOS project.pbxproj: no MARKETING_VERSION / CURRENT_PROJECT_VERSION lines updated');
    return;
  }
  fs.writeFileSync(pbxprojPath, next, 'utf8');
  console.log(
    `✓ Set iOS MARKETING_VERSION=${marketingVersion} CURRENT_PROJECT_VERSION=${currentProjectVersion}`
  );
}

const iosBuild = previousIosBuild ?? defaultIosBuildFromSemver(version);
syncIosXcodeVersions(version, iosBuild);

// Read service worker template
const swTemplatePath = path.join(root, 'public', 'service-worker.js');
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
