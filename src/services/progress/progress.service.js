import { apiCall } from '../apiHelpers';

// Book progress functions
export const getUserBookProgress = async (userId, bookId) => {
  return apiCall(`/v1/progress/${userId}/${bookId}`);
};

export const getAllUserBookProgress = async (userId) => {
  return apiCall(`/v1/progress/user/${userId}`);
};

export const updateUserBookProgress = async (userId, bookId, progressData) => {
  return apiCall(`/v1/progress/${userId}/${bookId}`, {
    method: 'PUT',
    body: JSON.stringify(progressData),
  });
};

export const getAllUsersProgressForBook = async (bookId) => {
  return apiCall(`/v1/progress/book/${bookId}`);
};

export const deleteUserBookProgress = async (userId, bookId) => {
  await apiCall(`/v1/progress/${userId}/${bookId}`, {
    method: 'DELETE',
  });
};

