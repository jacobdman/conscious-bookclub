import { apiCall } from '../apiHelpers';

// Subscribe to push notifications
export const subscribeToNotifications = async (userId, subscription) => {
  const params = new URLSearchParams({ userId });
  const result = await apiCall(`/v1/notifications/subscribe?${params}`, {
    method: 'POST',
    body: JSON.stringify({ subscription }),
  });
  return result;
};

// Unsubscribe from push notifications
export const unsubscribeFromNotifications = async (userId, subscription) => {
  const params = new URLSearchParams({ userId });
  await apiCall(`/v1/notifications/unsubscribe?${params}`, {
    method: 'DELETE',
    body: JSON.stringify({ subscription }),
  });
};

// Get user's push subscription status
export const getSubscriptionStatus = async (userId) => {
  const params = new URLSearchParams({ userId });
  const subscriptions = await apiCall(`/v1/notifications/subscription?${params}`);
  return subscriptions;
};

