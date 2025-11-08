import { apiCall } from '../apiHelpers';

// User functions
export const createUserDocument = async (user) => {
  await apiCall('/v1/users', {
    method: 'POST',
    body: JSON.stringify({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
    }),
  });
};

export const getUserDocument = async (userId) => {
  const user = await apiCall(`/v1/users/${userId}`);
  return user;
};

export const getAllUsers = async () => {
  const users = await apiCall('/v1/users');
  return users;
};

export const updateNotificationPreferences = async (userId, preferences) => {
  const user = await apiCall(`/v1/users/${userId}/notification-preferences`, {
    method: 'PATCH',
    body: JSON.stringify(preferences),
  });
  return user;
};

export const updateUserProfile = async (userId, profileData) => {
  const params = new URLSearchParams({ userId: userId.toString() });
  const user = await apiCall(`/v1/users/${userId}/profile?${params}`, {
    method: 'PATCH',
    body: JSON.stringify(profileData),
  });
  return user;
};

