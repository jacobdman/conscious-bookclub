import { getTopReaders } from '../books/books.service';

// Stats functions - redirecting to new endpoints
// Note: getUserStats and getBookStats endpoints are deprecated
// Consider migrating to books/progress endpoint for book stats

export const getUserStats = async (userId) => {
  // This endpoint is no longer available - consider removing usage
  // If needed, can be re-implemented in users controller
  throw new Error('getUserStats endpoint has been removed. Please use books/progress endpoint instead.');
};

export const getTopFinishedBooksUsers = async (clubId, limitCount = 10) => {
  // Redirect to new books/top-readers endpoint
  return getTopReaders(clubId, limitCount);
};

export const getBookStats = async (bookId) => {
  // This endpoint is no longer available - use books/progress endpoint instead
  // which includes stats for all books with upcoming discussions
  throw new Error('getBookStats endpoint has been removed. Please use books/progress endpoint instead.');
};

