/**
 * Capacitor native platform initialization.
 * Only runs when app is running inside Capacitor (iOS/Android), not in browser.
 */
import { Capacitor, registerPlugin } from '@capacitor/core';

const WindowPlugin = Capacitor.isNativePlatform()
  ? registerPlugin('Window')
  : null;

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
 * Match software keyboard + accessory bar appearance to app light/dark mode (iOS).
 * Avoids a mismatched black keyboard strip when the app UI is light.
 */
export async function syncIosKeyboardForTheme(paletteMode) {
  if (Capacitor.getPlatform() !== 'ios') return;

  try {
    const { Keyboard, KeyboardStyle } = await import('@capacitor/keyboard');
    await Keyboard.setStyle({
      style: paletteMode === 'dark' ? KeyboardStyle.Dark : KeyboardStyle.Light,
    });
  } catch (e) {
    console.warn('syncIosKeyboardForTheme failed:', e);
  }
}

/**
 * Set the native UIWindow background color to match the app theme.
 * The window is exposed behind the WebView during KeyboardResize.Native.
 * @param {string} hexColor - e.g. '#F5F1EA' or '#181512'
 */
export async function syncIosWindowBackground(hexColor) {
  if (Capacitor.getPlatform() !== 'ios' || !WindowPlugin) return;

  try {
    await WindowPlugin.setBackgroundColor({ color: hexColor });
  } catch (e) {
    console.warn('syncIosWindowBackground failed:', e);
  }
}

/**
 * Initialize native UI: status bar, keyboard behavior, and hide splash screen.
 * Call once when the app is ready (e.g. after auth loading is done).
 */
export async function initCapacitorNative() {
  if (!Capacitor.isNativePlatform()) return;

  const [{ StatusBar, Style }, { Keyboard, KeyboardResize }, { SplashScreen }] = await Promise.all([
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

  // Keyboard: resize native WebView so layout viewport (incl. fixed modals) shrinks with keyboard.
  // That resize is driven by the OS (not CSS); the web layer cannot animate WebView bounds smoothly.
  try {
    await Keyboard.setResizeMode({ mode: KeyboardResize.Native });
  } catch (e) {
    console.warn('Keyboard config failed:', e);
  }

  // iPhone: show keyboard accessory bar (strip above keys) so users have a clearer path than "tap outside"
  try {
    if (Capacitor.getPlatform() === 'ios') {
      await Keyboard.setAccessoryBarVisible({ isVisible: true });
    }
  } catch (e) {
    console.warn('Keyboard accessory bar config failed:', e);
  }

  // Initial keyboard appearance before React theme runs (Layout calls syncIosKeyboardForTheme with club palette).
  try {
    if (Capacitor.getPlatform() === 'ios' && typeof window !== 'undefined') {
      const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches;
      await syncIosKeyboardForTheme(prefersDark ? 'dark' : 'light');
    }
  } catch (e) {
    console.warn('Initial keyboard style sync failed:', e);
  }

  // Hide splash screen when app is ready
  try {
    await SplashScreen.hide();
  } catch (e) {
    console.warn('SplashScreen.hide failed:', e);
  }
}
