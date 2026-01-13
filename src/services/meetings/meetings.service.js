import { apiCall } from '../apiHelpers';

// Meetings functions
export const getMeetings = async (
  clubId,
  userId = null,
  startDate = null,
  endDate = null,
  limit = null
) => {
  const params = new URLSearchParams({ clubId: clubId.toString() });
  if (userId) {
    params.append('userId', userId);
  }
  if (startDate) {
    params.append('startDate', startDate);
  }
  if (endDate) {
    params.append('endDate', endDate);
  }
  if (limit) {
    params.append('limit', limit.toString());
  }
  const meetings = await apiCall(`/v1/meetings?${params}`);
  return meetings;
};

export const createMeeting = async (userId, clubId, meetingData) => {
  const params = new URLSearchParams({ 
    userId, 
    clubId: clubId.toString() 
  });
  const meeting = await apiCall(`/v1/meetings?${params}`, {
    method: 'POST',
    body: JSON.stringify(meetingData),
  });
  return meeting;
};

export const updateMeeting = async (userId, clubId, meetingId, meetingData) => {
  const params = new URLSearchParams({ 
    userId, 
    clubId: clubId.toString() 
  });
  const meeting = await apiCall(`/v1/meetings/${meetingId}?${params}`, {
    method: 'PATCH',
    body: JSON.stringify(meetingData),
  });
  return meeting;
};

