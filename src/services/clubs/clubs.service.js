import { apiCall } from '../apiHelpers';

// Clubs CRUD functions
export const getUserClubs = async (userId) => {
  const params = new URLSearchParams({ userId });
  return apiCall(`/v1/clubs?${params}`);
};

export const createClub = async (userId, name) => apiCall('/v1/clubs', {
  method: 'POST',
  body: JSON.stringify({ userId, name }),
});

export const getClub = async (clubId, userId) => {
  const params = new URLSearchParams({ userId });
  return apiCall(`/v1/clubs/${clubId}?${params}`);
};

export const getClubMembers = async (clubId, userId) => {
  const params = new URLSearchParams({ userId });
  return apiCall(`/v1/clubs/${clubId}/members?${params}`);
};

export const updateClub = async (clubId, userId, data) => {
  const params = new URLSearchParams({ userId });
  return apiCall(`/v1/clubs/${clubId}?${params}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const addClubMember = async (clubId, userId, newUserId) => {
  const params = new URLSearchParams({ userId });
  return apiCall(`/v1/clubs/${clubId}/members?${params}`, {
    method: 'POST',
    body: JSON.stringify({ newUserId }),
  });
};

export const removeClubMember = async (clubId, userId, memberUserId) => {
  const params = new URLSearchParams({ userId });
  await apiCall(`/v1/clubs/${clubId}/members/${memberUserId}?${params}`, {
    method: 'DELETE',
  });
};

export const updateMemberRole = async (clubId, userId, memberUserId, role) => {
  const params = new URLSearchParams({ userId });
  return apiCall(`/v1/clubs/${clubId}/members/${memberUserId}/role?${params}`, {
    method: 'PUT',
    body: JSON.stringify({ role }),
  });
};

export const deleteClub = async (clubId, userId) => {
  const params = new URLSearchParams({ userId });
  await apiCall(`/v1/clubs/${clubId}?${params}`, {
    method: 'DELETE',
  });
};

export const joinClubByInviteCode = async (inviteCode, userId) => {
  return apiCall('/v1/clubs/join', {
    method: 'POST',
    body: JSON.stringify({ inviteCode, userId }),
  });
};

export const rotateInviteCode = async (clubId, userId) => {
  const params = new URLSearchParams({ userId });
  return apiCall(`/v1/clubs/${clubId}/rotate-invite-code?${params}`, {
    method: 'POST',
  });
};

