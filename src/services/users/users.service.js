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

