import { Capacitor } from '@capacitor/core';

const VIBRATION_PATTERNS = {
  light: 20,
  medium: [30, 50],
  heavy: [50, 80, 50],
};

const NATIVE_IMPACT_STYLE = {
  light: 'Light',
  medium: 'Medium',
  heavy: 'Heavy',
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
 * Fire a haptic/vibration signal. Uses native haptics on Capacitor (iOS/Android),
 * falls back to Vibration API on web.
 * In development on web, logs when invoked for easier debugging.
 */
export const triggerHaptic = async (type = 'light') => {
  try {
    const support = getHapticsSupport();
    if (typeof window === 'undefined') {
      return { ...support, didVibrate: false };
    }

    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.log('[haptics] trigger', type);
    }

    if (Capacitor.isNativePlatform()) {
      const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
      const style = ImpactStyle[NATIVE_IMPACT_STYLE[type] || 'Light'];
      await Haptics.impact({ style });
      return { ...support, didVibrate: true };
    }

    if (!support.hasVibrate) {
      if (process.env.NODE_ENV === 'development') {
        // eslint-disable-next-line no-console
        console.log('[haptics] unsupported', support);
      }
      return { ...support, didVibrate: false };
    }

    const pattern = VIBRATION_PATTERNS[type] || VIBRATION_PATTERNS.light;
    const didVibrate = navigator.vibrate(pattern);
    return { ...support, didVibrate };
  } catch (err) {
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

