/**
 * Platform detection for web vs Capacitor native (iOS/Android).
 * Use this to branch behavior between PWA/browser and native app.
 */
import { Capacitor } from '@capacitor/core';

/**
 * Whether the app is running inside a Capacitor native shell (iOS or Android).
 * @returns {boolean}
 */
export const isNativeApp = () => Capacitor.isNativePlatform();

/**
 * Current platform: 'ios' | 'android' | 'web'.
 * @returns {'ios' | 'android' | 'web'}
 */
export const getPlatform = () => {
  if (!Capacitor.isNativePlatform()) return 'web';
  const p = Capacitor.getPlatform();
  if (p === 'ios' || p === 'android') return p;
  return 'web';
};
