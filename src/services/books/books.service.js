import { apiCall } from '../apiHelpers';

// Books CRUD functions
export const getBooks = async () => {
  const result = await apiCall('/v1/books');
  return result.books || result;
};

export const addBook = async (book) => {
  const result = await apiCall('/v1/books', {
    method: 'POST',
    body: JSON.stringify(book),
  });
  return result;
};

export const updateBook = async (bookId, updates) => {
  await apiCall(`/v1/books/${bookId}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  });
};

export const deleteBook = async (bookId) => {
  await apiCall(`/v1/books/${bookId}`, {
    method: 'DELETE',
  });
};

// Books pagination and filtering
export const getBooksPage = async (pageNumber = 1, pageSize = 10, orderByField = 'created_at', orderDirection = 'desc', userId = null) => {
  const params = new URLSearchParams({
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

export const getBooksPageFiltered = async (theme, pageNumber = 1, pageSize = 10, orderByField = 'created_at', orderDirection = 'desc', userId = null) => {
  const params = new URLSearchParams({
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

export const getAllDiscussedBooks = async () => {
  return apiCall('/v1/books/discussed');
};

// Legacy functions for backward compatibility
export const getBookMetadata = async () => {
  // For PostgreSQL, we compute this on-demand
  const result = await getBooksPage(1, 1);
  return { totalCount: result.totalCount, lastUpdated: new Date() };
};

export const updateBookMetadata = async (incrementBy = 1) => {
  // This is a no-op for PostgreSQL since we compute metadata on-demand
};

export const initializeBookMetadata = async () => {
  const result = await getBooksPage(1, 1);
  return result.totalCount;
};

// Books progress functions
export const getBooksProgress = async (page = 1, pageSize = 10, bookId = null) => {
  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
  });
  if (bookId) {
    params.append('bookId', bookId.toString());
  }
  return apiCall(`/v1/books/progress?${params}`);
};

export const getTopReaders = async (limit = 10) => {
  const params = new URLSearchParams({ limit: limit.toString() });
  return apiCall(`/v1/books/top-readers?${params}`);
};

