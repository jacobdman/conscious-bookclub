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
import { getBookMetadata, getBooksPage, getBooksPageFiltered, initializeBookMetadata, getUserBookProgress, updateUserBookProgress, getAllDiscussedBooks } from '../services/firestoreService';
import { useAuth } from '../AuthContext';
import Layout from './Layout';
import AddBookForm from './AddBookForm';

const BookList = () => {
  const { user } = useAuth();
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
    try {
      const metadata = await getBookMetadata();
      let totalCount = metadata.totalCount;
      
      // If metadata shows 0 but we might have books, initialize it
      if (totalCount === 0) {
        totalCount = await initializeBookMetadata();
      }
      
      setTotalBookCount(totalCount);
      setTotalPages(Math.ceil(totalCount / pageSize));
    } catch (err) {
      // Error loading metadata
    }
  }, [pageSize]);

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
        // Load progress for cached books
        loadProgressForBooks(cached.books);
        return;
      }
      
      // Fetch from Firestore
      let result;
      if (theme !== 'all') {
        // Theme-filtered pagination
        result = await getBooksPageFiltered(theme, pageNumber, size, 'createdAt', 'desc');
        setFilteredCount(result.totalCount);
      } else if (filter === 'discussed') {
        // Filter by discussed books - get ALL discussed books first
        const allDiscussedBooks = await getAllDiscussedBooks();
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
        result = await getBooksPage(pageNumber, size, 'createdAt', 'desc');
        setFilteredCount(0); // Not filtering
      }
      
      setBooks(result.books);
      setTotalBookCount(result.totalCount);
      setTotalPages(Math.ceil(result.totalCount / size));
      
      // Cache this page
      setPageCache(prev => ({
        ...prev,
        [cacheKey]: { books: result.books, totalCount: result.totalCount }
      }));
      
      // Load progress for the books
      loadProgressForBooks(result.books);
      
    } catch (err) {
      setError('Failed to fetch books');
    } finally {
      setLoading(false);
    }
  }, [pageSize, pageCache, loadProgressForBooks]);

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

  useEffect(() => {
    const initializeData = async () => {
      await loadMetadata();
      await loadPage(1, selectedTheme, selectedFilter, pageSize);
    };
    initializeData();
  }, [selectedTheme, selectedFilter, pageSize, loadMetadata, loadPage]);

  const formatDate = (date) => {
    if (!date) return 'TBD';
    return new Date(date.seconds ? date.seconds * 1000 : date).toLocaleDateString();
  };

  const handleBookAdded = (newBook) => {
    // Always clear cache and reload data for both new books and edits
    clearCache(); // Invalidate cache
    loadMetadata();
    loadPage(currentPage, selectedTheme, selectedFilter, pageSize);
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
      <Box sx={{ p: 3 }}>
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
                      src={book.coverUrl}
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
                      {formatDate(book.discussionDate)}
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
