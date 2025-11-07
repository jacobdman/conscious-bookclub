import { apiCall } from '../apiHelpers';

// Meetings functions
export const getMeetings = async (clubId) => {
  const params = new URLSearchParams({ clubId: clubId.toString() });
  const meetings = await apiCall(`/v1/meetings?${params}`);
  return meetings;
};

