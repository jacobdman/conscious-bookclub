import React, { useState, useCallback, useContext, useEffect, useRef } from 'react';
import { useAuth } from 'AuthContext';
import useClubContext from 'contexts/Club';
import {
  getBooksPage,
  getBooksPageFiltered,
  getAllDiscussedBooks,
  addBook,
  updateBook as updateBookService,
  deleteBook as deleteBookService,
  likeBook,
  unlikeBook,
} from 'services/books/books.service';
import {
  updateUserBookProgress,
  getUserBookProgress
} from 'services/progress/progress.service';
import BooksContext from './BooksContext';

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
  
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  
  // New state for filters and pagination
  const [pagination, setPaginationState] = useState({ page: 1, pageSize: 10 });
  const [filters, setFiltersState] = useState({ theme: 'all', status: 'all' });
  const [search, setSearchState] = useState('');
  const [sort, setSortState] = useState({ field: 'createdAt', direction: 'desc' });
  
  // Debounce search term (500ms delay)
  const debouncedSearch = useDebounce(search, 500);

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
  const fetchBooks = useCallback(async () => {
    if (!currentClub) return;

    setLoading(true);
    setError(null);

    try {
      const { page, pageSize } = pagination;
      const { theme, status } = filters;
      const userId = user?.uid || null;
      // Map 'status' filter to 'readStatus' or handle 'scheduled' logic
      // status options: 'all', 'read' (readStatus=finished), 'scheduled' (logic)

      let result;

      const sortList = (list) => {
        const directionFactor = sort.direction === 'asc' ? 1 : -1;
        if (sort.field === 'likes') {
          return [...list].sort((a, b) => ((a.likesCount || 0) - (b.likesCount || 0)) * directionFactor);
        }
        if (sort.field === 'createdAt') {
          return [...list].sort((a, b) => {
            const aDate = a.createdAt || a.created_at;
            const bDate = b.createdAt || b.created_at;
            const aTime = aDate ? new Date(aDate).getTime() : 0;
            const bTime = bDate ? new Date(bDate).getTime() : 0;
            return (aTime - bTime) * directionFactor;
          });
        }
        if (sort.field === 'discussionDate') {
          return [...list].sort((a, b) => {
            const aDate = a.discussionDate || a.discussion_date;
            const bDate = b.discussionDate || b.discussion_date;
            const aTime = aDate ? new Date(aDate).getTime() : 0;
            const bTime = bDate ? new Date(bDate).getTime() : 0;
            return (aTime - bTime) * directionFactor;
          });
        }
        if (sort.field === 'title' || sort.field === 'author') {
          return [...list].sort((a, b) => {
            const aValue = (a[sort.field] || '').toString().toLowerCase();
            const bValue = (b[sort.field] || '').toString().toLowerCase();
            if (aValue < bValue) return -1 * directionFactor;
            if (aValue > bValue) return 1 * directionFactor;
            return 0;
          });
        }
        return list;
      };

      // Handle 'scheduled' filter combined with other logic
      if (status === 'scheduled') {
        // Handle scheduled filter - this fetches ALL scheduled books so pagination is manual slice
        let allScheduledBooks = await getAllDiscussedBooks(currentClub.id, userId);

        // Apply theme filter in memory if needed
        if (theme !== 'all') {
            if (theme === 'no-theme') {
                allScheduledBooks = allScheduledBooks.filter(book => !book.theme || book.theme.length === 0);
            } else {
                allScheduledBooks = allScheduledBooks.filter(book => {
                    const bookThemes = Array.isArray(book.theme) ? book.theme : [book.theme];
                    return bookThemes.includes(theme);
                });
            }
        }

        // Apply search filter in memory if needed
        if (debouncedSearch) {
          const lowerSearch = debouncedSearch.toLowerCase();
          allScheduledBooks = allScheduledBooks.filter(book => 
            book.title.toLowerCase().includes(lowerSearch) || 
            book.author.toLowerCase().includes(lowerSearch)
          );
        }

        allScheduledBooks = sortList(allScheduledBooks);

        const startIdx = (page - 1) * pageSize;
        const endIdx = startIdx + pageSize;
        const paginatedBooks = allScheduledBooks.slice(startIdx, endIdx);
        
        // Fetch progress for these books manually if user is logged in
        if (userId && paginatedBooks.length > 0) {
          const booksWithProgress = await Promise.all(paginatedBooks.map(async (book) => {
            try {
              const progress = await getUserBookProgress(userId, book.id);
              return { ...book, progress };
            } catch (e) {
              return book;
            }
          }));
          
          result = {
            books: booksWithProgress,
            totalCount: allScheduledBooks.length
          };
        } else {
          result = {
            books: paginatedBooks,
            totalCount: allScheduledBooks.length
          };
        }
      } else {
        // Standard API filtering for theme and read status
        const readStatus = status === 'read' ? 'finished' : null;

        if (theme !== 'all') {
            result = await getBooksPageFiltered(currentClub.id, theme, page, pageSize, sort.field, sort.direction, userId, readStatus, debouncedSearch);
        } else {
            result = await getBooksPage(currentClub.id, page, pageSize, sort.field, sort.direction, userId, readStatus, debouncedSearch);
        }
      }

      setTotalCount(result.totalCount);
      setTotalPages(Math.ceil(result.totalCount / pageSize));
      setBooks(result.books);
      
    } catch (err) {
      console.error('Error fetching books:', err);
      setError('Failed to fetch books');
    } finally {
      setLoading(false);
    }
  }, [currentClub, user, pagination, filters, debouncedSearch, sort]);

  const refreshBooks = useCallback(() => {
    fetchBooks();
  }, [fetchBooks]);

  // ******************EFFECTS/REACTIONS**********************
  // Re-fetch when dependencies change
  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  // ******************ACTIONS**********************
  const createBook = async (bookData) => {
    if (!currentClub) throw new Error('No club selected');
    if (!user?.uid) throw new Error('User not logged in');

    try {
      // 1. Make API call
      const newBook = await addBook(currentClub.id, bookData, user.uid);
      
      // 2. Update state: Prepend to current list
      setBooks(prev => [{
        ...newBook,
        likesCount: 0,
        isLiked: false,
      }, ...prev]);
      
      // Update count
      setTotalCount(prev => prev + 1);
      
      return newBook;
    } catch (err) {
      console.error('Error creating book:', err);
      throw err;
    }
  };

  const updateBook = async (bookId, updates) => {
    if (!currentClub) throw new Error('No club selected');

    try {
      const updatedBook = await updateBookService(currentClub.id, bookId, updates);
      
      setBooks(prev => prev.map(book => 
        book.id === bookId ? { ...book, ...updatedBook } : book
      ));
      
      return updatedBook;
    } catch (err) {
      console.error('Error updating book:', err);
      throw err;
    }
  };

  const deleteBook = async (bookId) => {
    if (!currentClub) throw new Error('No club selected');

    try {
      await deleteBookService(currentClub.id, bookId);
      
      setBooks(prev => prev.filter(b => b.id !== bookId));
      setTotalCount(prev => prev - 1);
    } catch (err) {
      console.error('Error deleting book:', err);
      throw err;
    }
  };

  const updateBookProgress = async (bookId, progressData) => {
    if (!user) throw new Error('User not logged in');
    
    // Optimistic update
    setBooks(prev => prev.map(book => {
      if (book.id === bookId) {
        // Merge existing progress with updates
        const currentProgress = book.progress || {};
        return {
          ...book,
          progress: {
            ...currentProgress,
            ...progressData,
            updatedAt: new Date().toISOString()
          }
        };
      }
      return book;
    }));

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

    setBooks(prev => prev.map(book => {
      if (book.id !== bookId) return book;
      const likesCount = Math.max(0, (book.likesCount || 0) + (shouldLike ? 1 : -1));
      return {
        ...book,
        isLiked: shouldLike,
        likesCount,
      };
    }));

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
