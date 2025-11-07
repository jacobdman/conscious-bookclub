import { apiCall } from '../apiHelpers';

// Meetings functions
export const getMeetings = async () => {
  const meetings = await apiCall('/v1/meetings');
  return { docs: meetings.map(meeting => ({ id: meeting.id, data: () => meeting })) };
};

