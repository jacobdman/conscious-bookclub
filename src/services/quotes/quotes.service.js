import { apiCall } from '../apiHelpers';

export const getQuotes = async (userId, clubId) => {
  const params = new URLSearchParams({ userId, clubId: clubId.toString() });
  return apiCall(`/v1/quotes?${params}`);
};

export const createQuote = async (userId, clubId, quoteData) => {
  const params = new URLSearchParams({ userId, clubId: clubId.toString() });
  return apiCall(`/v1/quotes?${params}`, {
    method: 'POST',
    body: JSON.stringify(quoteData),
  });
};

export const getFeaturedQuote = async (userId, clubId) => {
  const params = new URLSearchParams({ userId, clubId: clubId.toString() });
  return apiCall(`/v1/quotes/featured?${params}`);
};

export const setFeaturedQuote = async (userId, clubId, quoteId) => {
  const params = new URLSearchParams({ userId, clubId: clubId.toString() });
  return apiCall(`/v1/quotes/${quoteId}/feature?${params}`, {
    method: 'POST',
  });
};

export const clearFeaturedQuote = async (userId, clubId) => {
  const params = new URLSearchParams({ userId, clubId: clubId.toString() });
  return apiCall(`/v1/quotes/featured?${params}`, {
    method: 'DELETE',
  });
};
