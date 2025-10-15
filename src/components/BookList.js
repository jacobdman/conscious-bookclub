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
import { getBookMetadata, getBooksPage, getBooksPageFiltered, initializeBookMetadata } from '../services/firestoreService';
import Layout from './Layout';
import AddBookForm from './AddBookForm';

const BookList = () => {
  const [books, setBooks] = useState([]);           // Current page books only
  const [currentPage, setCurrentPage] = useState(1);
  const [totalBookCount, setTotalBookCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [selectedTheme, setSelectedTheme] = useState('all');
  const [pageSize, setPageSize] = useState(10);
  const [pageCache, setPageCache] = useState({});
  const [filteredCount, setFilteredCount] = useState(0);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addBookOpen, setAddBookOpen] = useState(false);
  const [editingBook, setEditingBook] = useState(null);

  // Cache helper functions
  const getCacheKey = (page, theme, size) => {
    return `page_${page}_${theme}_${size}`;
  };

  const clearCache = () => {
    console.log('🗑️ Clearing page cache');
    setPageCache({});
  };

  // Load metadata (total count)
  const loadMetadata = useCallback(async () => {
    try {
      const metadata = await getBookMetadata();
      let totalCount = metadata.totalCount;
      
      // If metadata shows 0 but we might have books, initialize it
      if (totalCount === 0) {
        console.log('Metadata shows 0 books, initializing...');
        totalCount = await initializeBookMetadata();
      }
      
      setTotalBookCount(totalCount);
      setTotalPages(Math.ceil(totalCount / pageSize));
    } catch (err) {
      console.error('Error loading metadata:', err);
    }
  }, [pageSize]);

  // Load a specific page
  const loadPage = useCallback(async (pageNumber, theme = 'all', size = pageSize) => {
    try {
      setLoading(true);
      setError(null);
      
      // Check cache first
      const cacheKey = getCacheKey(pageNumber, theme, size);
      const cached = pageCache[cacheKey];
      
      if (cached) {
        console.log('✅ Cache hit - 0 Firestore reads');
        setBooks(cached.books);
        setTotalBookCount(cached.totalCount);
        setFilteredCount(cached.totalCount);
        setTotalPages(Math.ceil(cached.totalCount / size));
        setLoading(false);
        return;
      }
      
      // Fetch from Firestore
      let result;
      if (theme === 'all') {
        // Regular pagination (no filter)
        result = await getBooksPage(pageNumber, size, 'createdAt', 'desc');
        setFilteredCount(0); // Not filtering
      } else {
        // Theme-filtered pagination
        result = await getBooksPageFiltered(theme, pageNumber, size, 'createdAt', 'desc');
        setFilteredCount(result.totalCount);
      }
      
      setBooks(result.books);
      setTotalBookCount(result.totalCount);
      setTotalPages(Math.ceil(result.totalCount / size));
      
      // Cache this page
      setPageCache(prev => ({
        ...prev,
        [cacheKey]: { books: result.books, totalCount: result.totalCount }
      }));
      
    } catch (err) {
      setError('Failed to fetch books');
      console.error('Error fetching books:', err);
    } finally {
      setLoading(false);
    }
  }, [pageSize, pageCache]);

  // Pagination handler
  const handlePageChange = (event, page) => {
    setCurrentPage(page);
    loadPage(page, selectedTheme, pageSize);
  };

  // Theme filter handler
  const handleThemeChange = (event) => {
    const theme = event.target.value;
    setSelectedTheme(theme);
    setCurrentPage(1);
    loadPage(1, theme, pageSize);
  };

  // Page size handler
  const handlePageSizeChange = (event) => {
    const newSize = event.target.value;
    setPageSize(newSize);
    setCurrentPage(1);
    clearCache(); // Clear cache since page size changed
    loadPage(1, selectedTheme, newSize);
  };

  useEffect(() => {
    const initializeData = async () => {
      await loadMetadata();
      await loadPage(1, selectedTheme, pageSize);
    };
    initializeData();
  }, [selectedTheme, pageSize, loadMetadata, loadPage]);

  const formatDate = (date) => {
    if (!date) return 'TBD';
    return new Date(date.seconds ? date.seconds * 1000 : date).toLocaleDateString();
  };

  const handleBookAdded = (newBook) => {
    console.log('📚 Book added/edited, reloading data...', newBook ? 'New book' : 'Book edited');
    // Always clear cache and reload data for both new books and edits
    clearCache(); // Invalidate cache
    loadMetadata();
    loadPage(currentPage, selectedTheme, pageSize);
    setEditingBook(null); // Clear editing state
  };

  const handleBookDeleted = (deletedBookId) => {
    clearCache(); // Invalidate cache
    loadMetadata();
    loadPage(currentPage, selectedTheme, pageSize);
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
