import { apiCall } from '../apiHelpers';

export const getClubGoalsReport = async (clubId, userId, startDate, endDate) => {
  const params = new URLSearchParams({ userId });
  if (startDate) {
    params.append('startDate', startDate.toISOString());
  }
  if (endDate) {
    params.append('endDate', endDate.toISOString());
  }
  return apiCall(`/v1/clubs/${clubId}/goals-report?${params}`);
};

