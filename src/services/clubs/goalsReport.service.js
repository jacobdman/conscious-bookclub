import { apiCall } from '../apiHelpers';

export const getClubGoalsReport = async (clubId, userId, startDate, endDate, includeAnalytics = false) => {
  const params = new URLSearchParams({ userId });
  if (startDate) {
    params.append('startDate', startDate.toISOString());
  }
  if (endDate) {
    params.append('endDate', endDate.toISOString());
  }
  if (includeAnalytics) {
    params.append('includeAnalytics', 'true');
  }
  return apiCall(`/v1/clubs/${clubId}/goals-report?${params}`);
};

