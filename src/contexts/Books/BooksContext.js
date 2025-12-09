import React from 'react';

const BooksContext = React.createContext({
  // State
  books: [],
  loading: false,
  error: null,
  totalCount: 0,
  totalPages: 0,
  pagination: { page: 1, pageSize: 10 },
  filters: { theme: 'all', status: 'all' },

  // Setters
  setPage: () => {},
  setPageSize: () => {},
  setFilters: () => {},
  
  // Actions
  createBook: async () => {},
  updateBook: async () => {},
  deleteBook: async () => {},
  updateBookProgress: async () => {},
  refreshBooks: async () => {},
});

export default BooksContext;
