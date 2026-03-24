import { Capacitor } from '@capacitor/core';

const PROD_WEB_URL = 'https://app.consciousbook.club';

/**
 * Public web origin for shareable links and API/socket URLs.
 * On native (Capacitor), window.location is capacitor://localhost — use the real app host.
 */
export const getAppOrigin = () => {
  if (Capacitor.isNativePlatform()) return PROD_WEB_URL;
  return window.location.origin;
};

export default PROD_WEB_URL;
