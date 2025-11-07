import { apiCall } from '../apiHelpers';

// Stats functions
export const getUserStats = async (userId) => {
  return apiCall(`/v1/stats/users/${userId}`);
};

export const getTopFinishedBooksUsers = async (limitCount = 10) => {
  const params = new URLSearchParams({ limit: limitCount.toString() });
  return apiCall(`/v1/stats/leaderboard?${params}`);
};

export const getBookStats = async (bookId) => {
  return apiCall(`/v1/stats/books/${bookId}`);
};

