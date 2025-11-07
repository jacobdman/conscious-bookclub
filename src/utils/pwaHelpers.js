/**
 * Utility functions for PWA detection and management
 */

/**
 * Check if the app is running as a PWA (installed on home screen)
 * @returns {boolean} True if running as PWA
 */
export const isRunningAsPWA = () => {
  // Check for standalone display mode (most reliable)
  if (window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }

  // iOS Safari specific check
  if (window.navigator.standalone === true) {
    return true;
  }

  // Check if launched from home screen (Android Chrome)
  if (window.matchMedia('(display-mode: fullscreen)').matches) {
    return true;
  }

  return false;
};

/**
 * Check if the device is mobile
 * @returns {boolean} True if mobile device
 */
export const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
};

/**
 * Check if the device is iOS
 * @returns {boolean} True if iOS device
 */
export const isIOS = () => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
};

/**
 * Check if the device is Android
 * @returns {boolean} True if Android device
 */
export const isAndroid = () => {
  return /Android/.test(navigator.userAgent);
};

/**
 * Check if the browser supports PWA installation
 * @returns {boolean} True if installation is supported
 */
export const canInstallPWA = () => {
  // Check for beforeinstallprompt event support (Android Chrome)
  return 'serviceWorker' in navigator && 'PushManager' in window;
};

/**
 * Detect the browser name
 * @returns {string} Browser name (safari, chrome, firefox, duckduckgo, edge, etc.)
 */
export const getBrowserName = () => {
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (userAgent.includes('duckduckgo')) {
    return 'duckduckgo';
  }
  if (userAgent.includes('edg/') || userAgent.includes('edge/')) {
    return 'edge';
  }
  if (userAgent.includes('firefox')) {
    return 'firefox';
  }
  if (userAgent.includes('chrome') && !userAgent.includes('edg')) {
    return 'chrome';
  }
  if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
    return 'safari';
  }
  
  return 'unknown';
};

/**
 * Check if the browser's share button is at the top (vs bottom)
 * @returns {boolean} True if share button is typically at the top
 */
export const isShareButtonAtTop = () => {
  const browser = getBrowserName();
  // DuckDuckGo and Firefox on iOS have share button at top
  return browser === 'duckduckgo' || browser === 'firefox';
};

