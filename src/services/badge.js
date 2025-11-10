// PWA Badge API utility functions
// The Badge API allows web apps to set a badge on the app icon
// Supported in Chrome/Edge on desktop and mobile

/**
 * Check if Badge API is supported
 */
export const isBadgeSupported = () => {
  return 'setAppBadge' in navigator;
};

/**
 * Set the badge count on the PWA icon
 * @param {number} count - The badge count to display
 */
export const setBadge = async (count) => {
  if (!isBadgeSupported()) {
    return;
  }

  try {
    if (count > 0) {
      await navigator.setAppBadge(count);
    } else {
      await clearBadge();
    }
  } catch (error) {
    console.error('Error setting badge:', error);
  }
};

/**
 * Clear the badge from the PWA icon
 */
export const clearBadge = async () => {
  if (!isBadgeSupported()) {
    return;
  }

  try {
    await navigator.clearAppBadge();
  } catch (error) {
    console.error('Error clearing badge:', error);
  }
};

