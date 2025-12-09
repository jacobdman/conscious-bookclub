import React, { useState, useCallback, useContext, useEffect } from 'react';
import { useAuth } from 'AuthContext';
import useClubContext from 'contexts/Club';
import {
  getBooksPage,
  getBooksPageFiltered,
  getAllDiscussedBooks,
  addBook,
  updateBook as updateBookService,
  deleteBook as deleteBookService,
} from 'services/books/books.service';
import {
  updateUserBookProgress,
  getUserBookProgress
} from 'services/progress/progress.service';
import BooksContext from './BooksContext';

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

      // Handle 'scheduled' filter combined with other logic
      if (status === 'scheduled') {
        // Handle scheduled filter - this fetches ALL scheduled books so pagination is manual slice
        let allScheduledBooks = await getAllDiscussedBooks(currentClub.id);

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
            result = await getBooksPageFiltered(currentClub.id, theme, page, pageSize, 'createdAt', 'desc', userId, readStatus);
        } else {
            result = await getBooksPage(currentClub.id, page, pageSize, 'createdAt', 'desc', userId, readStatus);
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
  }, [currentClub, user, pagination, filters]);

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

    try {
      // 1. Make API call
      const newBook = await addBook(currentClub.id, bookData);
      
      // 2. Update state: Prepend to current list
      setBooks(prev => [newBook, ...prev]);
      
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

        // Setters
        setPage,
        setPageSize,
        setFilters,

        // Actions
        createBook,
        updateBook,
        deleteBook,
        updateBookProgress,
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
