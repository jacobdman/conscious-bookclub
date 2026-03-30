import { apiCall } from '../apiHelpers';

/**
 * @param {number|string} clubId
 * @param {string} userId
 * @param {'discover'|'hot'|'champion'|'bookmarked'|'backlog_review'} queue
 * @param {number} [limit]
 * @param {number|string|null} [afterBookId] Cursor for the next page (discover, bookmarked, backlog_review).
 */
export const getSwipeQueue = async (clubId, userId, queue = 'discover', limit = 25, afterBookId = null) => {
  const params = new URLSearchParams({
    clubId: String(clubId),
    userId,
    queue,
    limit: String(limit),
  });
  if (afterBookId != null && afterBookId !== '') {
    params.set('afterBookId', String(afterBookId));
  }
  return apiCall(`/v1/books/discover/queue?${params}`);
};

/**
 * Records a swipe action for a club book. The API applies the correct semantics for the book’s
 * pool (e.g. suggested promotion, backlog re-validation survival); valid for titles loaded via
 * discover, bookmarked, or backlog_review queues.
 *
 * @param {number|string} clubId
 * @param {number|string} bookId
 * @param {string} userId
 * @param {'like'|'super_like'|'pass'|'bookmark'} action
 */
export const recordInteraction = async (clubId, bookId, userId, action) => {
  const params = new URLSearchParams({
    clubId: String(clubId),
    userId,
  });
  return apiCall(`/v1/books/discover/${bookId}/interact?${params}`, {
    method: 'POST',
    body: JSON.stringify({ action }),
  });
};

/**
 * @param {number|string} clubId
 * @param {number|string} bookId
 * @param {string} userId
 * @param {string} action
 */
export const removeInteraction = async (clubId, bookId, userId, action) => {
  const params = new URLSearchParams({
    clubId: String(clubId),
    userId,
    action,
  });
  return apiCall(`/v1/books/discover/${bookId}/interact?${params}`, {
    method: 'DELETE',
  });
};

export const getDiscoverStats = async (clubId, userId) => {
  const params = new URLSearchParams({
    clubId: String(clubId),
    userId,
  });
  return apiCall(`/v1/books/discover/stats?${params}`);
};
