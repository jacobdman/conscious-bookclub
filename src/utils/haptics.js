const VIBRATION_PATTERNS = {
  light: 10,
  medium: [15, 40],
  heavy: [25, 50, 75],
};

/**
 * Fire a lightweight haptic/vibration signal where supported.
 * In development on web, logs when invoked for easier debugging.
 */
export const triggerHaptic = (type = 'light') => {
  try {
    if (typeof window === 'undefined') return;
    const pattern = VIBRATION_PATTERNS[type] || VIBRATION_PATTERNS.light;

    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log('[haptics] trigger', type);
    }

    if (navigator?.vibrate) {
      navigator.vibrate(pattern);
    }
  } catch (err) {
    // Fail silently; haptics are best-effort.
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log('[haptics] error', err);
    }
  }
};

export default triggerHaptic;

