import { apiCall } from '../apiHelpers';

export const getPersonalGoalsReport = async (userId, clubId, startDate, endDate) => {
  const params = new URLSearchParams({ userId, clubId: clubId.toString() });
  if (startDate) {
    params.append('startDate', startDate.toISOString());
  }
  if (endDate) {
    params.append('endDate', endDate.toISOString());
  }
  return apiCall(`/v1/goals/report?${params}`);
};

