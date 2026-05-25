import { apiCall } from '../apiHelpers';

export const getClubGoals = async (clubId, userId) => {
  const params = new URLSearchParams({ userId });
  return apiCall(`/v1/clubs/${clubId}/club-goals?${params}`);
};

export const getClubGoal = async (clubId, clubGoalId, userId) => {
  const params = new URLSearchParams({ userId });
  return apiCall(`/v1/clubs/${clubId}/club-goals/${clubGoalId}?${params}`);
};

export const createClubGoal = async (clubId, userId, body) => {
  const params = new URLSearchParams({ userId });
  return apiCall(`/v1/clubs/${clubId}/club-goals?${params}`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
};

export const updateClubGoal = async (clubId, clubGoalId, userId, body) => {
  const params = new URLSearchParams({ userId });
  return apiCall(`/v1/clubs/${clubId}/club-goals/${clubGoalId}?${params}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
};

export const deleteClubGoal = async (clubId, clubGoalId, userId) => {
  const params = new URLSearchParams({ userId });
  return apiCall(`/v1/clubs/${clubId}/club-goals/${clubGoalId}?${params}`, {
    method: 'DELETE',
  });
};
