import React, { useState, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
// Context
import { useAuth } from 'AuthContext';
import useClubContext from 'contexts/Club';
import BooksContext from './BooksContext';
// Services
import { likeBook, unlikeBook } from 'services/books/books.service';
import { updateUserBookProgress } from 'services/progress/progress.service';
// Hooks
import { useBooks, useCreateBook, useUpdateBook, useDeleteBook } from 'hooks/useBooks';

const BOOKS_VIEW_STORAGE_KEY_PREFIX = 'books-view';

const getStoredBooksViewState = (clubId) => {
  if (typeof window === 'undefined' || !clubId) return null;
  try {
    const raw = sessionStorage.getItem(`${BOOKS_VIEW_STORAGE_KEY_PREFIX}-${clubId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      pagination: parsed.pagination && typeof parsed.pagination.page === 'number' && parsed.pagination.page >= 1
        ? { page: parsed.pagination.page, pageSize: Number(parsed.pagination.pageSize) || 10 }
        : { page: 1, pageSize: 10 },
      filters: parsed.filters && typeof parsed.filters === 'object'
        ? { theme: String(parsed.filters.theme ?? 'all'), status: String(parsed.filters.status ?? 'all') }
        : { theme: 'all', status: 'all' },
      search: typeof parsed.search === 'string' ? parsed.search : '',
      sort: parsed.sort && typeof parsed.sort === 'object'
        ? { field: String(parsed.sort.field ?? 'createdAt'), direction: String(parsed.sort.direction ?? 'desc') }
        : { field: 'createdAt', direction: 'desc' },
    };
  } catch {
    return null;
  }
};

const setStoredBooksViewState = (clubId, state) => {
  if (typeof window === 'undefined' || !clubId || !state) return;
  try {
    sessionStorage.setItem(`${BOOKS_VIEW_STORAGE_KEY_PREFIX}-${clubId}`, JSON.stringify(state));
  } catch {
    // ignore quota or parse errors
  }
};

// Simple debounce hook
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

const BooksProvider = ({ children }) => {
  // ******************STATE VALUES**********************
  const { user } = useAuth();
  const { currentClub } = useClubContext();

  const queryClient = useQueryClient();
  const lastRestoredClubIdRef = useRef(null);

  // New state for filters and pagination (restored from sessionStorage when club is set)
  const [pagination, setPaginationState] = useState({ page: 1, pageSize: 10 });
  const [filters, setFiltersState] = useState({ theme: 'all', status: 'all' });
  const [search, setSearchState] = useState('');
  const [sort, setSortState] = useState({ field: 'createdAt', direction: 'desc' });

  // Restore books view state from sessionStorage when mounting with a club (e.g. after switching back from Feed)
  useEffect(() => {
    const clubId = currentClub?.id;
    if (!clubId || lastRestoredClubIdRef.current === clubId) return;
    lastRestoredClubIdRef.current = clubId;
    const stored = getStoredBooksViewState(clubId);
    if (stored) {
      setPaginationState(stored.pagination);
      setFiltersState(stored.filters);
      setSearchState(stored.search);
      setSortState(stored.sort);
    }
  }, [currentClub?.id]);

  // Persist books view state to sessionStorage when it changes (so we can restore when user returns to Books tab)
  useEffect(() => {
    const clubId = currentClub?.id;
    if (!clubId) return;
    setStoredBooksViewState(clubId, {
      pagination,
      filters,
      search,
      sort,
    });
  }, [currentClub?.id, pagination, filters, search, sort]);

  // Debounce search term (500ms delay)
  const debouncedSearch = useDebounce(search, 500);

  const queryOptions = useMemo(() => ({
    page: pagination.page,
    pageSize: pagination.pageSize,
    filters,
    search: debouncedSearch,
    sort,
  }), [pagination, filters, debouncedSearch, sort]);

  const booksQueryKey = useMemo(() => (
    ['books', currentClub?.id, user?.uid, queryOptions]
  ), [currentClub?.id, user?.uid, queryOptions]);

  const {
    data,
    isLoading,
    error: queryError,
    refetch,
  } = useBooks(currentClub?.id, user?.uid, queryOptions);

  const books = data?.books || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / pagination.pageSize);
  const error = queryError?.message || (queryError ? 'Failed to fetch books' : null);
  const loading = isLoading;

  const createBookMutation = useCreateBook(currentClub?.id);
  const updateBookMutation = useUpdateBook(currentClub?.id);
  const deleteBookMutation = useDeleteBook(currentClub?.id);

  // ******************SETTERS FOR STATE**********************
  const setPage = (page) => {
    setPaginationState(prev => ({ ...prev, page }));
  };

  const setPageSize = (pageSize) => {
    setPaginationState(prev => ({ ...prev, pageSize, page: 1 }));
  };

  const setFilters = (newFilters) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
    setPaginationState(prev => ({ ...prev, page: 1 }));
  };

  const setSearch = (term) => {
    setSearchState(term);
    setPaginationState(prev => ({ ...prev, page: 1 }));
  };

  const setSort = (field, direction) => {
    setSortState({ field, direction });
    setPaginationState(prev => ({ ...prev, page: 1 }));
  };

  // ******************LOAD FUNCTIONS**********************
  const refreshBooks = useCallback(() => {
    refetch();
  }, [refetch]);

  // ******************ACTIONS**********************
  const createBook = async (bookData) => {
    if (!currentClub) throw new Error('No club selected');
    if (!user?.uid) throw new Error('User not logged in');

    try {
      const newBook = await createBookMutation.mutateAsync({
        bookData,
        userId: user.uid,
      });

      queryClient.setQueryData(booksQueryKey, (old) => {
        const existing = old || { books: [], totalCount: 0 };
        return {
          ...existing,
          books: [{
            ...newBook,
            likesCount: 0,
            isLiked: false,
          }, ...(existing.books || [])],
          totalCount: (existing.totalCount || 0) + 1,
        };
      });

      return newBook;
    } catch (err) {
      console.error('Error creating book:', err);
      throw err;
    }
  };

  const updateBook = async (bookId, updates) => {
    if (!currentClub) throw new Error('No club selected');

    try {
      const updatedBook = await updateBookMutation.mutateAsync({ bookId, updates });

      queryClient.setQueryData(booksQueryKey, (old) => {
        if (!old || !old.books) return old;
        return {
          ...old,
          books: old.books.map(book =>
            book.id === bookId ? { ...book, ...updatedBook } : book,
          ),
        };
      });
      
      return updatedBook;
    } catch (err) {
      console.error('Error updating book:', err);
      throw err;
    }
  };

  const deleteBook = async (bookId) => {
    if (!currentClub) throw new Error('No club selected');

    try {
      await deleteBookMutation.mutateAsync(bookId);

      queryClient.setQueryData(booksQueryKey, (old) => {
        if (!old || !old.books) return old;
        return {
          ...old,
          books: old.books.filter(book => book.id !== bookId),
          totalCount: Math.max(0, (old.totalCount || 0) - 1),
        };
      });
    } catch (err) {
      console.error('Error deleting book:', err);
      throw err;
    }
  };

  const updateBookProgress = async (bookId, progressData) => {
    if (!user) throw new Error('User not logged in');
    
    // Optimistic update
    queryClient.setQueryData(booksQueryKey, (old) => {
      if (!old || !old.books) return old;
      return {
        ...old,
        books: old.books.map(book => {
          if (book.id === bookId) {
            const currentProgress = book.progress || {};
            return {
              ...book,
              progress: {
                ...currentProgress,
                ...progressData,
                updatedAt: new Date().toISOString(),
              },
            };
          }
          return book;
        }),
      };
    });

    try {
      await updateUserBookProgress(user.uid, bookId, progressData);
      // We could re-fetch or assume optimistic update is correct
    } catch (err) {
      console.error('Error updating progress:', err);
      // Revert on error could be implemented here if strictly necessary
      refreshBooks(); // Re-fetch to sync state on error
      throw err;
    }
  };

  const toggleBookLike = async (bookId, shouldLike) => {
    if (!user || !currentClub) throw new Error('User not logged in');

    queryClient.setQueryData(booksQueryKey, (old) => {
      if (!old || !old.books) return old;
      return {
        ...old,
        books: old.books.map(book => {
          if (book.id !== bookId) return book;
          const likesCount = Math.max(0, (book.likesCount || 0) + (shouldLike ? 1 : -1));
          return {
            ...book,
            isLiked: shouldLike,
            likesCount,
          };
        }),
      };
    });

    try {
      if (shouldLike) {
        await likeBook(currentClub.id, bookId, user.uid);
      } else {
        await unlikeBook(currentClub.id, bookId, user.uid);
      }
    } catch (err) {
      console.error('Error toggling book like:', err);
      refreshBooks();
      throw err;
    }
  };

  // ******************EXPORTS**********************
  return (
    <BooksContext.Provider
      value={{
        // State
        books,
        loading,
        error,
        totalCount,
        totalPages,
        pagination,
        filters,
        search,
        sort,

        // Setters
        setPage,
        setPageSize,
        setFilters,
        setSearch,
        setSort,

        // Actions
        createBook,
        updateBook,
        deleteBook,
        updateBookProgress,
        toggleBookLike,
        refreshBooks,
      }}
    >
      {children}
    </BooksContext.Provider>
  );
};

export const useBooksContext = () => {
  const context = useContext(BooksContext);
  if (!context) {
    throw new Error('useBooksContext must be used within a BooksProvider');
  }
  return context;
};

export default BooksProvider;
