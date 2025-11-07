import { apiCall } from '../apiHelpers';

// Meetings functions
export const getMeetings = async () => {
  const meetings = await apiCall('/v1/meetings');
  return meetings;
};

