import { apiCall } from '../apiHelpers';

export const getBooksReport = async (clubId, userId) => {
  const params = new URLSearchParams({ userId });
  return apiCall(`/v1/clubs/${clubId}/books-report?${params}`);
};

