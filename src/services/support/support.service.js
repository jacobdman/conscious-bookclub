import { apiCall } from '../apiHelpers';

export const requestClubCreation = async (name, email, message) => {
  return apiCall('/v1/support/request-club', {
    method: 'POST',
    body: JSON.stringify({ name, email, message }),
  });
};

