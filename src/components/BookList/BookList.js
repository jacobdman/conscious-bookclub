import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Avatar,
  Chip,
  CircularProgress,
  Alert,
  Button,
  Fab,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon } from '@mui/icons-material';
import { getBookMetadata, getBooksPage, getBooksPageFiltered, initializeBookMetadata, getAllDiscussedBooks } from 'services/books/books.service';
import { getUserBookProgress, updateUserBookProgress } from 'services/progress/progress.service';
import { getMeetings } from 'services/meetings/meetings.service';
import { useAuth } from 'AuthContext';
import useClubContext from 'contexts/Club';
import Layout from 'components/Layout';
import AddBookForm from 'components/AddBookForm';

const BookList = () => {
  const { user } = useAuth();
  const { currentClub } = useClubContext();
  const [allBooks, setAllBooks] = useState([]);           // All loaded books in order
  const [loadedPages, setLoadedPages] = useState(new Set()); // Track which pages are loaded
  const [currentPage, setCurrentPage] = useState(1);
  const [totalBookCount, setTotalBookCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [selectedTheme, setSelectedTheme] = useState('all');
  const [selectedFilter, setSelectedFilter] = useState('all'); // New filter for discussed books
  const [pageSize, setPageSize] = useState(10);
  const [filteredCount, setFilteredCount] = useState(0);
  
  const [loading, setLoading] = useState(true);
  const [loadingPage, setLoadingPage] = useState(false); // Page-specific loading
  const [isInitialLoad, setIsInitialLoad] = useState(true); // Track if initial load is complete
  const [error, setError] = useState(null);
  const [addBookOpen, setAddBookOpen] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  
  // Progress tracking state
  const [bookProgress, setBookProgress] = useState({});
  const [loadingProgress, setLoadingProgress] = useState({});
  const [meetingDates, setMeetingDates] = useState({}); // Map of bookId -> earliest meeting date

  // Helper functions
  const isPageLoaded = useCallback((pageNumber) => {
    return loadedPages.has(pageNumber);
  }, [loadedPages]);

  const getBooksForPage = useCallback((pageNumber) => {
    const startIdx = (pageNumber - 1) * pageSize;
    const endIdx = startIdx + pageSize;
    return allBooks.slice(startIdx, endIdx).filter(Boolean);
  }, [allBooks, pageSize]);

  // Find gaps around a page that should be filled
  const findGapsAroundPage = useCallback((pageNumber, maxGapSize = 2) => {
    const gaps = [];
    const sortedPages = Array.from(loadedPages).sort((a, b) => a - b);
    
    // Find nearest loaded pages before and after
    const beforePages = sortedPages.filter(p => p < pageNumber);
    const afterPages = sortedPages.filter(p => p > pageNumber);
    
    const nearestBefore = beforePages.length > 0 ? Math.max(...beforePages) : null;
    const nearestAfter = afterPages.length > 0 ? Math.min(...afterPages) : null;
    
    // Check gap before
    if (nearestBefore !== null) {
      const gapSize = pageNumber - nearestBefore - 1;
      if (gapSize > 0 && gapSize <= maxGapSize) {
        for (let i = nearestBefore + 1; i < pageNumber; i++) {
          gaps.push(i);
        }
      }
    } else if (pageNumber > 1) {
      // No pages loaded before, fill up to maxGapSize pages before
      const startPage = Math.max(1, pageNumber - maxGapSize);
      for (let i = startPage; i < pageNumber; i++) {
        gaps.push(i);
      }
    }
    
    // Check gap after
    if (nearestAfter !== null) {
      const gapSize = nearestAfter - pageNumber - 1;
      if (gapSize > 0 && gapSize <= maxGapSize) {
        for (let i = pageNumber + 1; i < nearestAfter; i++) {
          gaps.push(i);
        }
      }
    }
    
    return gaps;
  }, [loadedPages]);

  // Insert books at correct position in array
  const insertBooksAtPage = useCallback((books, pageNumber) => {
    const startIdx = (pageNumber - 1) * pageSize;
    setAllBooks(prev => {
      const newBooks = [...prev];
      // Ensure array is large enough
      while (newBooks.length < startIdx + books.length) {
        newBooks.push(undefined);
      }
      // Insert books at correct positions
      books.forEach((book, index) => {
        newBooks[startIdx + index] = book;
      });
      return newBooks;
    });
  }, [pageSize]);

  // Load progress for all books on current page
  const loadProgressForBooks = useCallback(async (booksList) => {
    if (!user || !booksList || booksList.length === 0) return;

    const progressPromises = booksList.map(async (book) => {
      try {
        const progress = await getUserBookProgress(user.uid, book.id);
        return { bookId: book.id, progress };
      } catch (error) {
        // Error loading progress for book
        return { bookId: book.id, progress: null };
      }
    });

    const results = await Promise.all(progressPromises);
    const progressMap = {};
    results.forEach(({ bookId, progress }) => {
      progressMap[bookId] = progress;
    });
    setBookProgress(progressMap);
  }, [user]);

  // Load metadata (total count)
  const loadMetadata = useCallback(async () => {
    if (!currentClub) return;
    
    try {
      const metadata = await getBookMetadata(currentClub.id);
      let totalCount = metadata.totalCount;
      
      // If metadata shows 0 but we might have books, initialize it
      if (totalCount === 0) {
        totalCount = await initializeBookMetadata(currentClub.id);
      }
      
      setTotalBookCount(totalCount);
      setTotalPages(Math.ceil(totalCount / pageSize));
    } catch (err) {
      // Error loading metadata
    }
  }, [pageSize, currentClub]);

  // Fetch a single page
  const fetchPage = useCallback(async (pageNumber, theme = 'all', filter = 'all', size = pageSize) => {
    if (!currentClub) {
      throw new Error('No club selected');
    }

    const userId = user?.uid || null;
    let result;
    
    if (theme !== 'all') {
      // Theme-filtered pagination
      result = await getBooksPageFiltered(currentClub.id, theme, pageNumber, size, 'createdAt', 'desc', userId);
    } else if (filter === 'discussed') {
      // Filter by discussed books - get ALL discussed books first
      const allDiscussedBooks = await getAllDiscussedBooks(currentClub.id);
      
      // Then paginate the results
      const startIndex = (pageNumber - 1) * size;
      const endIndex = startIndex + size;
      const paginatedBooks = allDiscussedBooks.slice(startIndex, endIndex);
      
      result = {
        books: paginatedBooks,
        totalCount: allDiscussedBooks.length
      };
    } else {
      // Regular pagination (no filter)
      result = await getBooksPage(currentClub.id, pageNumber, size, 'createdAt', 'desc', userId);
    }
    
    return result;
  }, [pageSize, user, currentClub]);

  // Load a specific page
  const loadPage = useCallback(async (pageNumber, theme = 'all', filter = 'all', size = pageSize) => {
    // Check if page is already loaded
    if (isPageLoaded(pageNumber)) {
      // Page already loaded, just update metadata if needed
      return;
    }

    try {
      setLoadingPage(true);
      setError(null);
      
      // Fetch the requested page
      const result = await fetchPage(pageNumber, theme, filter, size);
      
      // Update total count and pages if this is first load or count changed
      if (totalBookCount === 0 || result.totalCount !== totalBookCount) {
        setTotalBookCount(result.totalCount);
        setTotalPages(Math.ceil(result.totalCount / size));
      }
      
      if (theme !== 'all' || filter === 'discussed') {
        setFilteredCount(result.totalCount);
      } else {
        setFilteredCount(0);
      }
      
      // Insert books at correct position in array
      insertBooksAtPage(result.books, pageNumber);
      
      // Mark page as loaded
      setLoadedPages(prev => new Set([...prev, pageNumber]));
      
      // Mark initial load as complete after first page loads
      if (isInitialLoad) {
        setIsInitialLoad(false);
      }
      
      // Extract progress from books response (if included)
      const progressMap = {};
      let hasProgressInResponse = false;
      result.books.forEach((book) => {
        if (book.progress !== undefined) {
          hasProgressInResponse = true;
          progressMap[book.id] = book.progress;
        }
      });
      
      if (hasProgressInResponse) {
        // Progress was included in the response, merge it
        setBookProgress(prev => ({ ...prev, ...progressMap }));
      } else if (user?.uid) {
        // Fallback: progress not in response, fetch separately
        loadProgressForBooks(result.books);
      }
      
      // Fill gaps around this page (background, non-blocking)
      // Only fill gaps after initial load is complete and when navigating between pages
      if (!isInitialLoad && loadedPages.size > 0) {
        const gaps = findGapsAroundPage(pageNumber);
        if (gaps.length > 0) {
        // Fill gaps in background without blocking UI
        Promise.all(gaps.map(gapPage => 
          fetchPage(gapPage, theme, filter, size).then(gapResult => {
            insertBooksAtPage(gapResult.books, gapPage);
            setLoadedPages(prev => new Set([...prev, gapPage]));
            
            // Extract progress for gap pages
            const gapProgressMap = {};
            gapResult.books.forEach((book) => {
              if (book.progress !== undefined) {
                gapProgressMap[book.id] = book.progress;
              }
            });
            if (Object.keys(gapProgressMap).length > 0) {
              setBookProgress(prev => ({ ...prev, ...gapProgressMap }));
            }
          }).catch(err => {
            // Silently fail for gap filling - not critical
            console.error(`Error filling gap page ${gapPage}:`, err);
          })
        ));
        }
      }
      
    } catch (err) {
      setError('Failed to fetch books');
      console.error('Error loading page:', err);
    } finally {
      setLoadingPage(false);
    }
  }, [pageSize, loadProgressForBooks, user, currentClub, isPageLoaded, fetchPage, insertBooksAtPage, findGapsAroundPage, totalBookCount, isInitialLoad, loadedPages]);

  // Pagination handler
  const handlePageChange = (event, page) => {
    setCurrentPage(page);
    loadPage(page, selectedTheme, selectedFilter, pageSize);
  };

  // Theme filter handler
  const handleThemeChange = (event) => {
    const theme = event.target.value;
    setSelectedTheme(theme);
    setCurrentPage(1);
    // Clear all books and loaded pages when filter changes
    setAllBooks([]);
    setLoadedPages(new Set());
    setIsInitialLoad(true); // Reset initial load flag
    loadPage(1, theme, selectedFilter, pageSize);
  };

  // Filter handler for discussed books
  const handleFilterChange = (event) => {
    const filter = event.target.value;
    setSelectedFilter(filter);
    setCurrentPage(1);
    // Clear all books and loaded pages when filter changes
    setAllBooks([]);
    setLoadedPages(new Set());
    setIsInitialLoad(true); // Reset initial load flag
    loadPage(1, selectedTheme, filter, pageSize);
  };

  // Page size handler
  const handlePageSizeChange = (event) => {
    const newSize = event.target.value;
    setPageSize(newSize);
    setCurrentPage(1);
    // Clear all books and loaded pages since page size changed
    setAllBooks([]);
    setLoadedPages(new Set());
    setIsInitialLoad(true); // Reset initial load flag
    loadPage(1, selectedTheme, selectedFilter, newSize);
  };

  // Progress update handler
  const handleProgressUpdate = async (bookId) => {
    if (!user) return;

    setLoadingProgress(prev => ({ ...prev, [bookId]: true }));

    try {
      const currentProgress = bookProgress[bookId];
      let newStatus;
      let updateData = {};

      if (!currentProgress || currentProgress.status === 'not_started') {
        newStatus = 'reading';
        updateData = {
          status: newStatus,
          startedAt: new Date(),
          privacy: 'public'
        };
      } else if (currentProgress.status === 'reading') {
        newStatus = 'finished';
        updateData = {
          status: newStatus,
          finishedAt: new Date(),
          percentComplete: 100,
          privacy: 'public'
        };
      } else if (currentProgress.status === 'finished') {
        newStatus = 'reading';
        updateData = {
          status: newStatus,
          startedAt: new Date(),
          finishedAt: null,
          percentComplete: null,
          privacy: 'public'
        };
      }

      await updateUserBookProgress(user.uid, bookId, updateData);
      
      // Update local state
      setBookProgress(prev => ({
        ...prev,
        [bookId]: {
          ...prev[bookId],
          ...updateData
        }
      }));
    } catch (error) {
      // Error updating book progress
    } finally {
      setLoadingProgress(prev => ({ ...prev, [bookId]: false }));
    }
  };

  const getButtonText = (bookId) => {
    const progress = bookProgress[bookId];
    if (!progress || progress.status === 'not_started') {
      return 'Mark as Started';
    } else if (progress.status === 'reading') {
      return 'Mark as Finished';
    } else if (progress.status === 'finished') {
      return 'Mark as Reading';
    }
    return 'Mark as Started';
  };

  // Load meetings to get discussion dates
  useEffect(() => {
    const loadMeetings = async () => {
      if (!currentClub) return;
      
      try {
        const meetings = await getMeetings(currentClub.id);
        // Create a map of bookId -> earliest meeting date
        const datesMap = {};
        meetings.forEach(meeting => {
          if (meeting.bookId) {
            const meetingDate = new Date(meeting.date);
            if (!datesMap[meeting.bookId] || meetingDate < new Date(datesMap[meeting.bookId])) {
              datesMap[meeting.bookId] = meeting.date;
            }
          }
        });
        setMeetingDates(datesMap);
      } catch (error) {
        console.error('Error loading meetings:', error);
      }
    };

    loadMeetings();
  }, [currentClub]);

  // Computed: current page books
  const currentBooks = React.useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize;
    const endIdx = startIdx + pageSize;
    return allBooks.slice(startIdx, endIdx).filter(Boolean);
  }, [allBooks, currentPage, pageSize]);

  // Use ref to prevent multiple initializations
  const initializedRef = useRef(false);
  const lastInitKeyRef = useRef('');

  useEffect(() => {
    // Create a key from the dependencies that should trigger re-initialization
    const initKey = `${currentClub?.id || ''}-${selectedTheme}-${selectedFilter}-${pageSize}`;
    
    // Only initialize if key changed or not yet initialized
    if (initKey !== lastInitKeyRef.current || !initializedRef.current) {
      initializedRef.current = true;
      lastInitKeyRef.current = initKey;
      
      const initializeData = async () => {
        setLoading(true);
        setAllBooks([]);
        setLoadedPages(new Set());
        setIsInitialLoad(true);
        await loadPage(1, selectedTheme, selectedFilter, pageSize);
        setLoading(false);
      };
      initializeData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTheme, selectedFilter, pageSize, currentClub]);

  const formatDate = (date) => {
    if (!date) return 'TBD';
    return new Date(date).toLocaleDateString();
  };

  const handleBookAdded = (book) => {
    if (!book) {
      // No book data provided, fallback to re-fetch
      setAllBooks([]);
      setLoadedPages(new Set());
      loadMetadata();
      loadPage(currentPage, selectedTheme, selectedFilter, pageSize);
      setEditingBook(null);
      return;
    }

    // Check if this is an update (book exists in allBooks) or a new book
    const existingBookIndex = allBooks.findIndex(b => b && b.id === book.id);
    
    if (existingBookIndex !== -1) {
      // Update existing book in memory
      setAllBooks(prev => {
        const updated = [...prev];
        updated[existingBookIndex] = { ...updated[existingBookIndex], ...book };
        return updated;
      });
    } else {
      // New book - need to reload to see it in the list
      // Clear and reload since new book might affect pagination
      setAllBooks([]);
      setLoadedPages(new Set());
      loadMetadata();
      loadPage(currentPage, selectedTheme, selectedFilter, pageSize);
    }
    
    setEditingBook(null); // Clear editing state
  };

  const handleBookDeleted = (deletedBookId) => {
    // Remove book from allBooks if it exists
    const existingBookIndex = allBooks.findIndex(b => b && b.id === deletedBookId);
    if (existingBookIndex !== -1) {
      setAllBooks(prev => {
        const updated = [...prev];
        updated[existingBookIndex] = undefined; // Mark as deleted
        return updated;
      });
    }
    
    // Invalidate all loaded pages since deletion affects pagination
    setLoadedPages(new Set());
    loadMetadata();
    loadPage(currentPage, selectedTheme, selectedFilter, pageSize);
    setEditingBook(null); // Clear editing state
  };

  const handleEditBook = (book) => {
    setEditingBook(book);
    setAddBookOpen(true);
  };

  const handleCloseForm = () => {
    setAddBookOpen(false);
    setEditingBook(null);
  };

  if (loading && allBooks.length === 0) {
    // Only show full-page spinner on initial load when no books are loaded
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error" action={
          <Button color="inherit" size="small" onClick={() => loadPage(currentPage, selectedTheme, selectedFilter, pageSize)}>
            Retry
          </Button>
        }>
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Layout>
      <Box sx={{ 
        p: 3, 
        height: '100%', 
        overflowY: 'auto', 
        overflowX: 'hidden' 
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h4" gutterBottom>
              Book List
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Showing {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, selectedTheme !== 'all' ? filteredCount : totalBookCount)} of {selectedTheme !== 'all' ? filteredCount : totalBookCount} books
              {selectedTheme !== 'all' && ' (filtered)'}
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setAddBookOpen(true)}
            sx={{ 
              minWidth: 140,
              display: { xs: 'none', md: 'flex' }
            }}
          >
            Add Book
          </Button>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Theme Filter</InputLabel>
            <Select
              value={selectedTheme}
              onChange={handleThemeChange}
              label="Theme Filter"
            >
              <MenuItem value="all">All Themes</MenuItem>
              <MenuItem value="Creative">Creative</MenuItem>
              <MenuItem value="Curious">Curious</MenuItem>
              <MenuItem value="Classy">Classy</MenuItem>
              <MenuItem value="no-theme">No Theme</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl sx={{ minWidth: 150 }}>
            <InputLabel>Book Filter</InputLabel>
            <Select
              value={selectedFilter}
              onChange={handleFilterChange}
              label="Book Filter"
            >
              <MenuItem value="all">All Books</MenuItem>
              <MenuItem value="discussed">Discussed Books</MenuItem>
            </Select>
          </FormControl>
          
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel>Per Page</InputLabel>
            <Select
              value={pageSize}
              onChange={handlePageSizeChange}
              label="Per Page"
            >
              <MenuItem value={10}>10</MenuItem>
              <MenuItem value={25}>25</MenuItem>
              <MenuItem value={50}>50</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Pagination */}
        {totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3, mb: 3 }}>
            <Pagination
              count={totalPages}
              page={currentPage}
              onChange={handlePageChange}
              color="primary"
            />
          </Box>
        )}

        {/* Loading indicator for page loading (doesn't hide content) */}
        {loadingPage && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <CircularProgress size={24} />
          </Box>
        )}

        <TableContainer component={Paper}>
          <Table sx={{ minWidth: 650 }} aria-label="books table">
            <TableHead>
              <TableRow>
                <TableCell>Cover</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Author</TableCell>
                <TableCell>Theme</TableCell>
                <TableCell>Genre</TableCell>
                <TableCell>Discussion Date</TableCell>
                <TableCell>My Progress</TableCell>
                <TableCell>Added</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {currentBooks.map((book) => (
                <TableRow
                  key={book.id}
                  sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                >
                  <TableCell>
                    <Avatar
                      src={book.coverImage}
                      alt={book.title}
                      variant="rounded"
                      sx={{ width: 60, height: 80 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="subtitle1" fontWeight="medium">
                      {book.title}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {book.author}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {(Array.isArray(book.theme) ? book.theme : [book.theme]).map((theme, index) => (
                        <Chip 
                          key={index}
                          label={theme} 
                          size="small" 
                          color="primary" 
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {book.genre || 'N/A'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatDate(meetingDates[book.id])}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 120 }}>
                      <Chip
                        label={bookProgress[book.id]?.status === 'finished' ? 'Finished' : 
                               bookProgress[book.id]?.status === 'reading' ? 'Reading' : 
                               'Not Started'}
                        size="small"
                        color={bookProgress[book.id]?.status === 'finished' ? 'success' : 
                               bookProgress[book.id]?.status === 'reading' ? 'primary' : 
                               'default'}
                        variant="outlined"
                      />
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => handleProgressUpdate(book.id)}
                        disabled={loadingProgress[book.id]}
                        sx={{ minWidth: 100 }}
                      >
                        {loadingProgress[book.id] ? (
                          <CircularProgress size={16} />
                        ) : (
                          getButtonText(book.id)
                        )}
                      </Button>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {formatDate(book.createdAt)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<EditIcon />}
                      onClick={() => handleEditBook(book)}
                      sx={{ minWidth: 80 }}
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {currentBooks.length === 0 && !loadingPage && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" color="text.secondary">
              No books found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Add some books to get started!
            </Typography>
          </Box>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Pagination
              count={totalPages}
              page={currentPage}
              onChange={handlePageChange}
              color="primary"
            />
          </Box>
        )}

        {/* Floating Action Button for mobile */}
        <Fab
          color="primary"
          aria-label="add book"
          onClick={() => setAddBookOpen(true)}
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            display: { xs: 'flex', md: 'none' }
          }}
        >
          <AddIcon />
        </Fab>
      </Box>

      <AddBookForm
        open={addBookOpen}
        onClose={handleCloseForm}
        onBookAdded={handleBookAdded}
        onBookDeleted={handleBookDeleted}
        editingBook={editingBook}
      />
    </Layout>
  );
};

export default BookList;
