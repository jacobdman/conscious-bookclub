import { Capacitor } from '@capacitor/core';
import { apiCall } from '../apiHelpers';

// Subscribe to push notifications (web - subscription object from pushManager.subscribe)
export const subscribeToNotifications = async (userId, subscription) => {
  const params = new URLSearchParams({ userId });
  const result = await apiCall(`/v1/notifications/subscribe?${params}`, {
    method: 'POST',
    body: JSON.stringify({ subscription }),
  });
  return result;
};

// Register native (Capacitor) push token with backend
export const registerNativePushToken = async (userId, token, platform) => {
  const params = new URLSearchParams({ userId });
  const result = await apiCall(`/v1/notifications/subscribe-native?${params}`, {
    method: 'POST',
    body: JSON.stringify({ token, platform }),
  });
  return result;
};

// Get native push subscription status (for Capacitor apps)
export const getNativeSubscriptionStatus = async (userId) => {
  const params = new URLSearchParams({ userId });
  return apiCall(`/v1/notifications/subscription-native?${params}`);
};

/**
 * Unified: request permission and register for push. On native (Capacitor) uses
 * FCM/APNs token; on web uses PushManager subscription.
 * @param {string} userId
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export const requestPermissionAndSubscribe = async (userId) => {
  if (!userId) return { success: false, error: 'userId required' };

  if (Capacitor.isNativePlatform()) {
    try {
      const { PushNotifications } = await import('@capacitor/push-notifications');
      const perm = await PushNotifications.requestPermissions();
      if (perm.receive !== 'granted') {
        return { success: false, error: 'Permission denied' };
      }
      const platform = Capacitor.getPlatform();
      const token = await new Promise((resolve, reject) => {
        let regHandle;
        let errHandle;
        const cleanup = () => {
          regHandle?.then((h) => h.remove());
          errHandle?.then((h) => h.remove());
        };
        PushNotifications.addListener('registration', (ev) => {
          cleanup();
          resolve(ev.value || ev);
        }).then((h) => { regHandle = h; });
        PushNotifications.addListener('registrationError', (ev) => {
          cleanup();
          reject(new Error(ev.error || 'Registration failed'));
        }).then((h) => { errHandle = h; });
        PushNotifications.register();
      });
      const tokenStr = typeof token === 'string' ? token : token?.value;
      if (!tokenStr) return { success: false, error: 'No token received' };
      await registerNativePushToken(userId, tokenStr, platform);
      return { success: true };
    } catch (err) {
      return { success: false, error: err?.message || 'Native push registration failed' };
    }
  }

  // Web: use service worker and PushManager
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { success: false, error: 'Push not supported' };
  }
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { success: false, error: 'Permission denied' };
    }
    const registration = await navigator.serviceWorker.ready;
    const vapidPublicKey = process.env.REACT_APP_VAPID_PUBLIC_KEY;
    const applicationServerKey = vapidPublicKey
      ? urlBase64ToUint8Array(vapidPublicKey)
      : undefined;
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    });
    await subscribeToNotifications(userId, subscription.toJSON());
    return { success: true };
  } catch (err) {
    return { success: false, error: err?.message || 'Web push subscription failed' };
  }
};

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Unsubscribe from push notifications
export const unsubscribeFromNotifications = async (userId, subscription) => {
  const params = new URLSearchParams({ userId });
  await apiCall(`/v1/notifications/unsubscribe?${params}`, {
    method: 'DELETE',
    body: JSON.stringify({ subscription }),
  });
};

// Get user's push subscription status (web subscriptions or native tokens, depending on platform)
export const getSubscriptionStatus = async (userId) => {
  if (Capacitor.isNativePlatform()) {
    const nativeTokens = await getNativeSubscriptionStatus(userId);
    return Array.isArray(nativeTokens) ? nativeTokens : [];
  }
  const params = new URLSearchParams({ userId });
  const subscriptions = await apiCall(`/v1/notifications/subscription?${params}`);
  return subscriptions;
};

// Send a test push notification (optional type: 'feed' | 'goal' | 'meeting' for preset payload)
export const sendTestNotification = async (userId, title, body, type) => {
  const params = new URLSearchParams({ userId });
  const bodyPayload = {};
  if (type != null) bodyPayload.type = type;
  if (title != null) bodyPayload.title = title;
  if (body != null) bodyPayload.body = body;
  const result = await apiCall(`/v1/notifications/test?${params}`, {
    method: 'POST',
    body: JSON.stringify(bodyPayload),
  });
  return result;
};

