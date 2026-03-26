/**
 * Capacitor native platform initialization.
 * Only runs when app is running inside Capacitor (iOS/Android), not in browser.
 */
import { Capacitor } from '@capacitor/core';

export function isNativePlatform() {
  return Capacitor.isNativePlatform();
}

/**
 * Sync status bar icon style with app light/dark mode (iOS overlay layout).
 * Call when club/theme palette mode changes (e.g. from Layout).
 * @param {'light' | 'dark'} paletteMode
 */
export async function syncIosStatusBarForTheme(paletteMode) {
  if (Capacitor.getPlatform() !== 'ios') return;

  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({
      style: paletteMode === 'dark' ? Style.Dark : Style.Light,
    });
  } catch (e) {
    console.warn('syncIosStatusBarForTheme failed:', e);
  }
}

/**
 * Initialize native UI: status bar, keyboard behavior, and hide splash screen.
 * Call once when the app is ready (e.g. after auth loading is done).
 */
export async function initCapacitorNative() {
  if (!Capacitor.isNativePlatform()) return;

  const [{ StatusBar, Style }, { Keyboard }, { SplashScreen }] = await Promise.all([
    import('@capacitor/status-bar'),
    import('@capacitor/keyboard'),
    import('@capacitor/splash-screen'),
  ]);

  try {
    if (Capacitor.getPlatform() === 'ios') {
      await StatusBar.setOverlaysWebView({ overlay: true });
      await StatusBar.setStyle({ style: Style.Default });
    } else {
      await StatusBar.setStyle({ style: Style.Dark });
      await StatusBar.setBackgroundColor({ color: '#BFA480' });
    }
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
