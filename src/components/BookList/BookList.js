import React, { useState, useEffect, useRef } from 'react';
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
  MenuItem,
  TextField,
  InputAdornment,
  Collapse,
  IconButton,
  ClickAwayListener,
  Tooltip
} from '@mui/material';
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Search as SearchIcon, 
  FilterList as FilterListIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { getMeetings } from 'services/meetings/meetings.service';
import { useAuth } from 'AuthContext';
import useClubContext from 'contexts/Club';
import useBooksContext from 'contexts/Books';
import Layout from 'components/Layout';
import AddBookForm from 'components/AddBookForm';
import { parseLocalDate } from 'utils/dateHelpers';

const BookList = () => {
  const { user } = useAuth();
  const { currentClub } = useClubContext();
  const { 
    books, 
    loading: contextLoading, 
    error: contextError, 
    totalCount, 
    totalPages,
    pagination,
    filters,
    search,
    setPage,
    setPageSize,
    setFilters,
    setSearch,
    updateBookProgress,
    refreshBooks
  } = useBooksContext();

  const [addBookOpen, setAddBookOpen] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  
  // Local UI state for button loading
  const [loadingProgress, setLoadingProgress] = useState({});
  const [meetingDates, setMeetingDates] = useState({}); // Map of bookId -> earliest meeting date

  // UI Enhancement States
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const searchInputRef = useRef(null);

  // Load meetings to get discussion dates (keeping this logic for now as it aggregates meetings)
  useEffect(() => {
    const loadMeetings = async () => {
      if (!currentClub) return;
      
      try {
        const meetings = await getMeetings(currentClub.id);
        // Create a map of bookId -> earliest meeting date
        const datesMap = {};
        meetings.forEach(meeting => {
          if (meeting.bookId) {
            const meetingDate = parseLocalDate(meeting.date);
            if (!datesMap[meeting.bookId] || meetingDate < parseLocalDate(datesMap[meeting.bookId])) {
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

  // Handlers
  const handlePageChange = (event, page) => {
    setPage(page);
  };

  const handleThemeChange = (event) => {
    setFilters({ theme: event.target.value });
  };

  const handleFilterChange = (event) => {
    setFilters({ status: event.target.value });
  };

  const handlePageSizeChange = (event) => {
    setPageSize(parseInt(event.target.value, 10));
  };
  
  const handleSearchChange = (event) => {
    setSearch(event.target.value);
  };

  const handleSearchClick = () => {
    setIsSearchExpanded(true);
    // Give time for render
    setTimeout(() => {
        if (searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, 100);
  };

  const handleSearchClickAway = () => {
      if (!search) {
          setIsSearchExpanded(false);
      }
  };

  const handleClearSearch = () => {
      setSearch('');
      if (searchInputRef.current) {
          searchInputRef.current.focus();
      }
  };

  const toggleFilters = () => {
      setShowFilters(prev => !prev);
  };

  const handleProgressUpdate = async (book) => {
    if (!user) return;

    const bookId = book.id;
    setLoadingProgress(prev => ({ ...prev, [bookId]: true }));

    try {
      const currentProgress = book.progress;
      let newStatus;
      let updateData = {};

      if (!currentProgress || !currentProgress.status || currentProgress.status === 'not_started') {
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

      await updateBookProgress(bookId, updateData);
      
    } catch (error) {
      // Error is handled in context
    } finally {
      setLoadingProgress(prev => ({ ...prev, [bookId]: false }));
    }
  };

  const getButtonText = (book) => {
    const progress = book.progress;
    if (!progress || !progress.status || progress.status === 'not_started') {
      return 'Mark as Started';
    } else if (progress.status === 'reading') {
      return 'Mark as Finished';
    } else if (progress.status === 'finished') {
      return 'Mark as Reading';
    }
    return 'Mark as Started';
  };

  const formatDate = (date) => {
    if (!date) return 'TBD';
    return new Date(date).toLocaleDateString();
  };

  const handleCloseForm = () => {
    setAddBookOpen(false);
    setEditingBook(null);
  };
  
  const handleBookAdded = () => {
    handleCloseForm();
    // No need to refresh manually, context handles it (optimistically or via re-fetch if we wanted)
  };

  const handleBookDeleted = () => {
    handleCloseForm();
  };

  const handleEditBook = (book) => {
    setEditingBook(book);
    setAddBookOpen(true);
  };

  if (contextLoading && books.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (contextError) {
    return (
      <Box sx={{ p: 2 }}>
        <Alert severity="error" action={
          <Button color="inherit" size="small" onClick={refreshBooks}>
            Retry
          </Button>
        }>
          {contextError}
        </Alert>
      </Box>
    );
  }

  return (
    <Layout>
      <Box sx={{ 
        p: 2, 
        height: '100%', 
        overflowY: 'auto', 
        overflowX: 'hidden' 
      }}>
        
        {/* Header Section */}
        <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            mb: 1
        }}>
          {/* <Box> */}
            <Typography variant="h4" fontWeight="bold">
              Book List
            </Typography>
          {/* </Box> */}
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setAddBookOpen(true)}
            sx={{ 
              display: { xs: 'none', md: 'flex' }
            }}
          >
            Add Book
          </Button>
        </Box>

        {/* Controls Toolbar */}
        <Paper 
            elevation={0}
            sx={{ 
                p: 2, 
                mb: 1, 
                borderRadius: 3, 
                backgroundColor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 2
            }}
        >
            {/* Expandable Search */}
            <ClickAwayListener onClickAway={handleSearchClickAway}>
                <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    transition: 'all 0.3s ease',
                    width: isSearchExpanded || search ? '100%' : 'auto',
                    maxWidth: isSearchExpanded || search ? 400 : 48,
                    position: 'relative',
                    flexGrow: isSearchExpanded || search ? 1 : 0
                }}>
                    {!isSearchExpanded && !search ? (
                         <Tooltip title="Search Books">
                            <IconButton onClick={handleSearchClick} color="primary">
                                <SearchIcon />
                            </IconButton>
                        </Tooltip>
                    ) : (
                        <TextField
                            inputRef={searchInputRef}
                            placeholder="Search Books..."
                            variant="outlined"
                            size="small"
                            value={search}
                            onChange={handleSearchChange}
                            fullWidth
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 5,
                                    backgroundColor: 'action.hover'
                                }
                            }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon color="action" />
                                    </InputAdornment>
                                ),
                                endAdornment: search && (
                                    <InputAdornment position="end">
                                        <IconButton size="small" onClick={handleClearSearch}>
                                            <CloseIcon fontSize="small" />
                                        </IconButton>
                                    </InputAdornment>
                                )
                            }}
                        />
                    )}
                </Box>
            </ClickAwayListener>

            {/* Filter Toggle and Per Page */}
            <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
                <Button 
                    startIcon={<FilterListIcon />}
                    endIcon={showFilters ? <CloseIcon fontSize="small" /> : null}
                    onClick={toggleFilters}
                    color={showFilters || filters.theme !== 'all' || filters.status !== 'all' ? "primary" : "inherit"}
                    sx={{ 
                        textTransform: 'none',
                        borderRadius: 2
                    }}
                >
                    Filters
                </Button>
                <FormControl size="small" sx={{ minWidth: 80 }}>
                    <InputLabel>Per Page</InputLabel>
                    <Select
                        value={pagination.pageSize}
                        onChange={handlePageSizeChange}
                        label="Per Page"
                    >
                        <MenuItem value={10}>10</MenuItem>
                        <MenuItem value={25}>25</MenuItem>
                        <MenuItem value={50}>50</MenuItem>
                    </Select>
                </FormControl>
            </Box>
        </Paper>

        {/* Collapsible Filters Section */}
        <Collapse in={showFilters}>
            <Paper 
                elevation={0}
                sx={{ 
                    p: 2, 
                    mb: 1, 
                    borderRadius: 3, 
                    backgroundColor: 'background.default', 
                    border: '1px dashed',
                    borderColor: 'divider'
                }}
            >
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                    <FormControl sx={{ minWidth: 200 }} size="small">
                        <InputLabel>Theme Filter</InputLabel>
                        <Select
                            value={filters.theme}
                            onChange={handleThemeChange}
                            label="Theme Filter"
                            sx={{ borderRadius: 2 }}
                        >
                            <MenuItem value="all">All Themes</MenuItem>
                            <MenuItem value="Creative">Creative</MenuItem>
                            <MenuItem value="Curious">Curious</MenuItem>
                            <MenuItem value="Classy">Classy</MenuItem>
                            <MenuItem value="no-theme">No Theme</MenuItem>
                        </Select>
                    </FormControl>
                
                    <FormControl sx={{ minWidth: 250 }} size="small">
                        <InputLabel>Book Filter</InputLabel>
                        <Select
                            value={filters.status}
                            onChange={handleFilterChange}
                            label="Book Filter"
                            sx={{ borderRadius: 2 }}
                        >
                            <MenuItem value="all">All Books</MenuItem>
                            <MenuItem value="scheduled">Books Scheduled for Meetings</MenuItem>
                            <MenuItem value="read">Books I've Read</MenuItem>
                        </Select>
                    </FormControl>
                </Box>
            </Paper>
        </Collapse>

        {/* Top Pagination */}
        {totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1, mb: 1 }}>
            <Pagination
              count={totalPages}
              page={pagination.page}
              onChange={handlePageChange}
              color="primary"
            />
          </Box>
        )}

        <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'right', mb: 1 }}>
          Showing {books.length} of {totalCount} books
          {filters.theme !== 'all' && ' (filtered)'}
        </Typography>

        {/* Loading overlay for list refresh */}
        {contextLoading && books.length > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
            <CircularProgress size={24} />
          </Box>
        )}

        <TableContainer 
            component={Paper} 
            elevation={2}
            sx={{ 
                borderRadius: 3,
                mb: 2,
                border: '1px solid',
                borderColor: 'divider',
                overflowX: 'auto',
                overflowY: 'visible'
            }}
        >
          <Table stickyHeader aria-label="books table">
            <TableHead>
              <TableRow sx={{ backgroundColor: 'action.hover' }}>
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
                  sx={{ 
                      '&:last-child td, &:last-child th': { border: 0 },
                      '&:hover': { backgroundColor: 'action.hover' },
                      transition: 'background-color 0.2s'
                  }}
                >
                  <TableCell>
                    <Avatar
                      src={book.coverImage}
                      alt={book.title}
                      variant="rounded"
                      sx={{ 
                          width: 60, 
                          height: 85,
                          boxShadow: 2,
                          borderRadius: 1
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {book.title}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
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
                          variant="filled"
                          sx={{ borderRadius: 1.5 }}
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
                    <Typography variant="body2" fontWeight="medium">
                      {formatDate(meetingDates[book.id])}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 120 }}>
                      <Chip
                        label={book.progress?.status === 'finished' ? 'Finished' : 
                               book.progress?.status === 'reading' ? 'Reading' : 
                               'Not Started'}
                        size="small"
                        color={book.progress?.status === 'finished' ? 'success' : 
                               book.progress?.status === 'reading' ? 'primary' : 
                               'default'}
                        variant={book.progress?.status ? "filled" : "outlined"}
                      />
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => handleProgressUpdate(book)}
                        disabled={loadingProgress[book.id]}
                        sx={{ 
                            minWidth: 100, 
                            borderRadius: 5,
                            textTransform: 'none',
                            fontSize: '0.75rem'
                        }}
                      >
                        {loadingProgress[book.id] ? (
                          <CircularProgress size={16} />
                        ) : (
                          getButtonText(book)
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
                    <IconButton
                      size="small"
                      onClick={() => handleEditBook(book)}
                      color="default"
                    >
                      <EditIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {books.length === 0 && !contextLoading && (
          <Box sx={{ textAlign: 'center', py: 8, backgroundColor: 'action.hover', borderRadius: 4 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No books found
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Add some books to get started!
            </Typography>
            <Button 
                variant="outlined" 
                startIcon={<AddIcon />}
                onClick={() => setAddBookOpen(true)}
            >
                Add Your First Book
            </Button>
          </Box>
        )}

        {/* Bottom Pagination */}
        {totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
            <Pagination
              count={totalPages}
              page={pagination.page}
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
            bottom: 72,
            right: 24,
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
