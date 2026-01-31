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
  search: '',
  sort: { field: 'createdAt', direction: 'desc' },

  // Setters
  setPage: () => {},
  setPageSize: () => {},
  setFilters: () => {},
  setSearch: () => {},
  setSort: () => {},
  
  // Actions
  createBook: async () => {},
  updateBook: async () => {},
  deleteBook: async () => {},
  updateBookProgress: async () => {},
  toggleBookLike: async () => {},
  refreshBooks: async () => {},
});

export default BooksContext;
