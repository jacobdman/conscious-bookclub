import { apiCall } from '../apiHelpers';

// Feed read status functions
export const getReadStatus = async (clubId, userId) => {
  const params = new URLSearchParams({ 
    clubId: clubId.toString(),
    userId: userId,
  });
  const result = await apiCall(`/v1/feed/read-status?${params}`);
  return result;
};

export const markAsRead = async (clubId, userId, lastReadAt = null) => {
  const params = new URLSearchParams({ 
    clubId: clubId.toString(),
    userId: userId,
  });
  const body = lastReadAt ? { lastReadAt } : {};
  const result = await apiCall(`/v1/feed/mark-read?${params}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return result;
};

