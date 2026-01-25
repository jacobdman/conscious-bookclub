const VIBRATION_PATTERNS = {
  light: 20,
  medium: [30, 50],
  heavy: [50, 80, 50],
};

export const getHapticsSupport = () => {
  if (typeof window === 'undefined') {
    return {
      isSecureContext: false,
      hasVibrate: false,
      hasUserActivation: false,
    };
  }

  return {
    isSecureContext: Boolean(window.isSecureContext),
    hasVibrate: typeof navigator?.vibrate === 'function',
    hasUserActivation: Boolean(navigator?.userActivation?.hasBeenActive),
  };
};

/**
 * Fire a lightweight haptic/vibration signal where supported.
 * In development on web, logs when invoked for easier debugging.
 */
export const triggerHaptic = (type = 'light') => {
  try {
    const support = getHapticsSupport();
    if (typeof window === 'undefined') {
      return { ...support, didVibrate: false };
    }
    const pattern = VIBRATION_PATTERNS[type] || VIBRATION_PATTERNS.light;

    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log('[haptics] trigger', type);
    }

    if (!support.hasVibrate) {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.log('[haptics] unsupported', support);
      }
      return { ...support, didVibrate: false };
    }

    const didVibrate = navigator.vibrate(pattern);
    return { ...support, didVibrate };
  } catch (err) {
    // Fail silently; haptics are best-effort.
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log('[haptics] error', err);
    }
    return {
      isSecureContext: Boolean(window?.isSecureContext),
      hasVibrate: typeof navigator?.vibrate === 'function',
      hasUserActivation: Boolean(navigator?.userActivation?.hasBeenActive),
      didVibrate: false,
    };
  }
};

export default triggerHaptic;

