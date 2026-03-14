/**
 * Capacitor native platform initialization.
 * Only runs when app is running inside Capacitor (iOS/Android), not in browser.
 */
import { Capacitor } from '@capacitor/core';

export function isNativePlatform() {
  return Capacitor.isNativePlatform();
}

/**
 * Initialize native UI: status bar, keyboard behavior, and hide splash screen.
 * Call once when the app is ready (e.g. after auth loading is done).
 */
export async function initCapacitorNative() {
  if (!Capacitor.isNativePlatform()) return;

  const [{ StatusBar }, { Keyboard }, { SplashScreen }] = await Promise.all([
    import('@capacitor/status-bar'),
    import('@capacitor/keyboard'),
    import('@capacitor/splash-screen'),
  ]);

  // Status bar: match app theme (#BFA480 - light background, use dark content)
  try {
    await StatusBar.setStyle({ style: 'DARK' });
    await StatusBar.setBackgroundColor({ color: '#BFA480' });
  } catch (e) {
    console.warn('StatusBar config failed:', e);
  }

  // Keyboard: resize body so content scrolls above keyboard instead of being covered
  try {
    await Keyboard.setResizeMode({ mode: 'body' });
  } catch (e) {
    console.warn('Keyboard config failed:', e);
  }

  // Hide splash screen when app is ready
  try {
    await SplashScreen.hide();
  } catch (e) {
    console.warn('SplashScreen.hide failed:', e);
  }
}
