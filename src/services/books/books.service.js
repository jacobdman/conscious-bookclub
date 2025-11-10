import { apiCall } from '../apiHelpers';

// Books CRUD functions
export const getBooks = async (clubId) => {
  const params = new URLSearchParams({ clubId: clubId.toString() });
  const result = await apiCall(`/v1/books?${params}`);
  return result.books || result;
};

export const addBook = async (clubId, book) => {
  const params = new URLSearchParams({ clubId: clubId.toString() });
  const result = await apiCall(`/v1/books?${params}`, {
    method: 'POST',
    body: JSON.stringify(book),
  });
  return result;
};

export const updateBook = async (clubId, bookId, updates) => {
  const params = new URLSearchParams({ clubId: clubId.toString() });
  const result = await apiCall(`/v1/books/${bookId}?${params}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
  return result;
};

export const deleteBook = async (clubId, bookId) => {
  const params = new URLSearchParams({ clubId: clubId.toString() });
  await apiCall(`/v1/books/${bookId}?${params}`, {
    method: 'DELETE',
  });
};

// Books pagination and filtering
export const getBooksPage = async (clubId, pageNumber = 1, pageSize = 10, orderByField = 'created_at', orderDirection = 'desc', userId = null) => {
  const params = new URLSearchParams({
    clubId: clubId.toString(),
    page: pageNumber.toString(),
    pageSize: pageSize.toString(),
    orderBy: orderByField,
    orderDirection,
  });
  if (userId) {
    params.append('userId', userId);
  }
  return apiCall(`/v1/books?${params}`);
};

export const getBooksPageFiltered = async (clubId, theme, pageNumber = 1, pageSize = 10, orderByField = 'created_at', orderDirection = 'desc', userId = null) => {
  const params = new URLSearchParams({
    clubId: clubId.toString(),
    theme,
    page: pageNumber.toString(),
    pageSize: pageSize.toString(),
    orderBy: orderByField,
    orderDirection,
  });
  if (userId) {
    params.append('userId', userId);
  }
  return apiCall(`/v1/books/filtered?${params}`);
};

export const getAllDiscussedBooks = async (clubId) => {
  const params = new URLSearchParams({ clubId: clubId.toString() });
  return apiCall(`/v1/books/discussed?${params}`);
};

// Legacy functions for backward compatibility
export const getBookMetadata = async (clubId) => {
  // For PostgreSQL, we compute this on-demand
  const result = await getBooksPage(clubId, 1, 1);
  return { totalCount: result.totalCount, lastUpdated: new Date() };
};

export const updateBookMetadata = async (incrementBy = 1) => {
  // This is a no-op for PostgreSQL since we compute metadata on-demand
};

export const initializeBookMetadata = async (clubId) => {
  const result = await getBooksPage(clubId, 1, 1);
  return result.totalCount;
};

// Books progress functions
export const getBooksProgress = async (clubId, page = 1, pageSize = 10, bookId = null) => {
  const params = new URLSearchParams({
    clubId: clubId.toString(),
    page: page.toString(),
    pageSize: pageSize.toString(),
  });
  if (bookId) {
    params.append('bookId', bookId.toString());
  }
  return apiCall(`/v1/books/progress?${params}`);
};

export const getTopReaders = async (clubId, limit = 10) => {
  const params = new URLSearchParams({ 
    clubId: clubId.toString(),
    limit: limit.toString() 
  });
  return apiCall(`/v1/books/top-readers?${params}`);
};

