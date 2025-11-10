import React, { useState, useEffect, useCallback } from 'react';
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
  const [books, setBooks] = useState([]);           // Current page books only
  const [currentPage, setCurrentPage] = useState(1);
  const [totalBookCount, setTotalBookCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [selectedTheme, setSelectedTheme] = useState('all');
  const [selectedFilter, setSelectedFilter] = useState('all'); // New filter for discussed books
  const [pageSize, setPageSize] = useState(10);
  const [pageCache, setPageCache] = useState({});
  const [filteredCount, setFilteredCount] = useState(0);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addBookOpen, setAddBookOpen] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  
  // Progress tracking state
  const [bookProgress, setBookProgress] = useState({});
  const [loadingProgress, setLoadingProgress] = useState({});
  const [meetingDates, setMeetingDates] = useState({}); // Map of bookId -> earliest meeting date

  // Cache helper functions
  const getCacheKey = (page, theme, filter, size) => {
    return `page_${page}_${theme}_${filter}_${size}`;
  };

  const clearCache = () => {
    setPageCache({});
  };

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

  // Load a specific page
  const loadPage = useCallback(async (pageNumber, theme = 'all', filter = 'all', size = pageSize) => {
    try {
      setLoading(true);
      setError(null);
      
      // Check cache first
      const cacheKey = getCacheKey(pageNumber, theme, filter, size);
      const cached = pageCache[cacheKey];
      
      if (cached) {
        setBooks(cached.books);
        setTotalBookCount(cached.totalCount);
        setFilteredCount(cached.totalCount);
        setTotalPages(Math.ceil(cached.totalCount / size));
        setLoading(false);
        
        // Extract progress from cached books if available
        const progressMap = {};
        let hasProgressInResponse = false;
        cached.books.forEach((book) => {
          if (book.progress !== undefined) {
            hasProgressInResponse = true;
            progressMap[book.id] = book.progress;
          }
        });
        
        if (hasProgressInResponse) {
          setBookProgress(progressMap);
        } else if (user?.uid) {
          // Fallback: load progress separately if not in cached data
          loadProgressForBooks(cached.books);
        }
        return;
      }
      
      // Fetch books with progress included if userId is available
      if (!currentClub) {
        setError('No club selected');
        setLoading(false);
        return;
      }

      const userId = user?.uid || null;
      let result;
      if (theme !== 'all') {
        // Theme-filtered pagination
        result = await getBooksPageFiltered(currentClub.id, theme, pageNumber, size, 'createdAt', 'desc', userId);
        setFilteredCount(result.totalCount);
      } else if (filter === 'discussed') {
        // Filter by discussed books - get ALL discussed books first
        const allDiscussedBooks = await getAllDiscussedBooks(currentClub.id);
        setFilteredCount(allDiscussedBooks.length);
        
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
        setFilteredCount(0); // Not filtering
      }
      
      setBooks(result.books);
      setTotalBookCount(result.totalCount);
      setTotalPages(Math.ceil(result.totalCount / size));
      
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
        // Progress was included in the response, use it directly
        setBookProgress(progressMap);
      } else if (userId) {
        // Fallback: progress not in response, fetch separately
        loadProgressForBooks(result.books);
      }
      
      // Cache this page
      setPageCache(prev => ({
        ...prev,
        [cacheKey]: { books: result.books, totalCount: result.totalCount }
      }));
      
    } catch (err) {
      setError('Failed to fetch books');
    } finally {
      setLoading(false);
    }
  }, [pageSize, pageCache, loadProgressForBooks, user, currentClub]);

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
    loadPage(1, theme, selectedFilter, pageSize);
  };

  // Filter handler for discussed books
  const handleFilterChange = (event) => {
    const filter = event.target.value;
    setSelectedFilter(filter);
    setCurrentPage(1);
    loadPage(1, selectedTheme, filter, pageSize);
  };

  // Page size handler
  const handlePageSizeChange = (event) => {
    const newSize = event.target.value;
    setPageSize(newSize);
    setCurrentPage(1);
    clearCache(); // Clear cache since page size changed
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

  useEffect(() => {
    const initializeData = async () => {
      await loadMetadata();
      await loadPage(1, selectedTheme, selectedFilter, pageSize);
    };
    initializeData();
  }, [selectedTheme, selectedFilter, pageSize, loadMetadata, loadPage]);

  const formatDate = (date) => {
    if (!date) return 'TBD';
    return new Date(date).toLocaleDateString();
  };

  const handleBookAdded = (book) => {
    if (!book) {
      // No book data provided, fallback to re-fetch
      clearCache();
      loadMetadata();
      loadPage(currentPage, selectedTheme, selectedFilter, pageSize);
      setEditingBook(null);
      return;
    }

    // Check if this is an update (book exists in current page) or a new book
    const existingBookIndex = books.findIndex(b => b.id === book.id);
    
    if (existingBookIndex !== -1) {
      // Update existing book in memory
      setBooks(prev => {
        const updated = [...prev];
        updated[existingBookIndex] = { ...updated[existingBookIndex], ...book };
        return updated;
      });
      
      // Update cache for current page
      const cacheKey = getCacheKey(currentPage, selectedTheme, selectedFilter, pageSize);
      setPageCache(prev => {
        const cached = prev[cacheKey];
        if (cached) {
          const updatedBooks = cached.books.map(b => 
            b.id === book.id ? { ...b, ...book } : b
          );
          return {
            ...prev,
            [cacheKey]: { ...cached, books: updatedBooks }
          };
        }
        return prev;
      });
      
      // Update metadata if needed (for new books, total count increases)
      // For updates, we don't need to reload metadata
    } else {
      // New book - need to reload to see it in the list
      clearCache();
      loadMetadata();
      loadPage(currentPage, selectedTheme, selectedFilter, pageSize);
    }
    
    setEditingBook(null); // Clear editing state
  };

  const handleBookDeleted = (deletedBookId) => {
    clearCache(); // Invalidate cache
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

  if (loading) {
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
          <Button color="inherit" size="small" onClick={() => loadPage(currentPage)}>
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
              {books.map((book) => (
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

        {books.length === 0 && (
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
