import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
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
  Tooltip,
  Tabs,
  Tab,
} from '@mui/material';
import { 
  Add as AddIcon, 
  Edit as EditIcon, 
  Search as SearchIcon, 
  FilterList as FilterListIcon,
  Close as CloseIcon,
  ThumbUp as ThumbUpIcon,
  ThumbUpOffAlt as ThumbUpOffAltIcon,
  Explore as ExploreIcon,
} from '@mui/icons-material';
import { useAuth } from 'AuthContext';
import { useMeetings } from 'hooks/useMeetings';
import useClubContext from 'contexts/Club';
import useBooksContext from 'contexts/Books';
import Layout from 'components/Layout';
import AddBookForm from 'components/AddBookForm';
import MeetingForm from 'components/MeetingForm';
import BookInfoDialog from 'components/BookInfoDialog';
import BooksTour from 'components/Tours/BooksTour';
import ClubBooksTab from 'components/ClubBooksTab';
import { parseLocalDate } from 'utils/dateHelpers';
import { bookCoverAvatarSx } from 'utils/bookCoverDisplay';
import { setOpenLibraryCoverSize, OL_COVER_SIZE } from 'services/openLibraryService';

const CLUB_TAB_INDEX = 1;

const BookList = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentClub, clubMembers } = useClubContext();
  const { 
    books, 
    loading: contextLoading, 
    error: contextError, 
    totalCount, 
    totalPages,
    pagination,
    filters,
    search,
    sort,
    setPage,
    setPageSize,
    setFilters,
    setSearch,
    setSort,
    updateBookProgress,
    updateBook,
    toggleBookLike,
    toggleBookSuperLike,
    refreshBooks
  } = useBooksContext();

  const [addBookOpen, setAddBookOpen] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  
  // Local UI state for button loading
  const [loadingProgress, setLoadingProgress] = useState({});
  const [meetingFormOpen, setMeetingFormOpen] = useState(false);

  const { data: meetingsList = [] } = useMeetings(currentClub?.id, user?.uid, {});
  const meetingDates = useMemo(() => {
    const datesMap = {};
    (meetingsList || []).forEach(meeting => {
      if (meeting.bookId) {
        const meetingDate = parseLocalDate(meeting.date);
        if (!datesMap[meeting.bookId] || meetingDate < parseLocalDate(datesMap[meeting.bookId])) {
          datesMap[meeting.bookId] = meeting.date;
        }
      }
    });
    return datesMap;
  }, [meetingsList]);
  const [meetingFormBook, setMeetingFormBook] = useState(null);
  const [meetingFormPreviousChosen, setMeetingFormPreviousChosen] = useState(false);
  const [selectedBookId, setSelectedBookId] = useState(null);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [loadingLikes, setLoadingLikes] = useState({});
  const [loadingSuperLikes, setLoadingSuperLikes] = useState({});
  const [bookListTab, setBookListTab] = useState(0);

  const isClubTabFromUrl = location.pathname === '/books/club';
  const effectiveTab = isClubTabFromUrl ? CLUB_TAB_INDEX : bookListTab;

  useEffect(() => {
    if (isClubTabFromUrl && bookListTab !== CLUB_TAB_INDEX) {
      setBookListTab(CLUB_TAB_INDEX);
    }
  }, [isClubTabFromUrl, bookListTab]);

  const handleBookListTabChange = (e, newValue) => {
    setBookListTab(newValue);
    if (newValue === CLUB_TAB_INDEX) {
      navigate('/books/club', { replace: true });
    } else {
      navigate('/books', { replace: true });
    }
  };

  // UI Enhancement States
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const searchInputRef = useRef(null);
  const themesEnabled = currentClub?.themesEnabled !== false;
  const themeOptions = Array.isArray(currentClub?.themes) && currentClub?.themes.length > 0
    ? currentClub.themes
    : ['Classy', 'Creative', 'Curious'];

  const sortedClubMembers = useMemo(() => {
    const list = Array.isArray(clubMembers) ? [...clubMembers] : [];
    list.sort((a, b) => {
      const nameA = (a.user?.displayName || a.user?.email || a.userId || '').toLowerCase();
      const nameB = (b.user?.displayName || b.user?.email || b.userId || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });
    return list;
  }, [clubMembers]);

  const suggestedByFilterUnknown =
    filters.suggestedBy !== 'all' &&
    !sortedClubMembers.some((m) => m.userId === filters.suggestedBy);

  const booksListSummaryLine = useMemo(() => {
    const viewLabels = {
      backlog: 'Bookclub Backlog',
      suggested: 'All Suggested',
      bookmarked: 'Bookmarked',
    };
    const scope = filters.listScope ?? 'backlog';
    const viewLabel = viewLabels[scope] ?? viewLabels.backlog;

    const hasExtraFilters =
      (themesEnabled && filters.theme !== 'all') ||
      filters.status !== 'all' ||
      filters.suggestedBy !== 'all' ||
      Boolean(search?.trim());

    const base = `Showing ${books.length} of ${totalCount} books — ${viewLabel}`;
    return hasExtraFilters ? `${base} (filtered)` : base;
  }, [
    books.length,
    totalCount,
    filters.listScope,
    filters.theme,
    filters.status,
    filters.suggestedBy,
    themesEnabled,
    search,
  ]);

  useEffect(() => {
    if (!themesEnabled && filters.theme !== 'all') {
      setFilters({ theme: 'all' });
    }
  }, [themesEnabled, filters.theme, setFilters]);

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

  const handleSuggestedByChange = (event) => {
    setFilters({ suggestedBy: event.target.value });
  };

  const handleListScopeChange = (event) => {
    setFilters({ listScope: event.target.value });
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

  const formatCreatedDate = (date) => {
    if (!date) return '—';
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

  const canManageMeetings = ['owner', 'admin', 'calendar-admin'].includes(currentClub?.role);

  const handleChooseForReading = async (book) => {
    if (!canManageMeetings) return;

    try {
      setMeetingFormPreviousChosen(!!book.chosenForBookclub);
      await updateBook(book.id, { chosenForBookclub: true });
      setMeetingFormBook(book);
      setMeetingFormOpen(true);
    } catch (error) {
      console.error('Error choosing book for reading:', error);
    }
  };

  const handleMeetingFormClose = async (revertSelection = true) => {
    if (revertSelection && meetingFormBook && !meetingFormPreviousChosen) {
      try {
        await updateBook(meetingFormBook.id, { chosenForBookclub: false });
      } catch (error) {
        console.error('Error reverting chosen book:', error);
      }
    }
    setMeetingFormOpen(false);
    setMeetingFormBook(null);
    setMeetingFormPreviousChosen(false);
  };

  const handleMeetingSaved = () => {
    handleMeetingFormClose(false);
  };

  const handleEditBook = (book) => {
    setEditingBook(book);
    setAddBookOpen(true);
  };

  const handleRowClick = (book) => {
    setSelectedBookId(book.id);
    setIsInfoOpen(true);
  };

  const handleInfoClose = () => {
    setIsInfoOpen(false);
  };

  const handleSort = (field, defaultDirection = 'asc') => {
    if (sort.field !== field) {
      setSort(field, defaultDirection);
      return;
    }
    setSort(field, sort.direction === 'desc' ? 'asc' : 'desc');
  };

  const handleToggleLike = async (event, book) => {
    if (event?.stopPropagation) {
      event.stopPropagation();
    }
    if (!user) return;

    setLoadingLikes(prev => ({ ...prev, [book.id]: true }));
    try {
      await toggleBookLike(book.id, !book.isLiked);
    } catch (error) {
      // Error handled in context
    } finally {
      setLoadingLikes(prev => ({ ...prev, [book.id]: false }));
    }
  };

  const handleSuperLikeToggle = async (bookId, shouldSuperLike) => {
    if (!user) return undefined;
    setLoadingSuperLikes((prev) => ({ ...prev, [bookId]: true }));
    try {
      return await toggleBookSuperLike(bookId, shouldSuperLike);
    } catch {
      return undefined;
    } finally {
      setLoadingSuperLikes((prev) => ({ ...prev, [bookId]: false }));
    }
  };

  const selectedBook = books.find((book) => book.id === selectedBookId) || null;

  // Force iOS WKWebView to re-evaluate scroll after content loads
  useEffect(() => {
    if (books.length === 0) return;
    const main = document.querySelector('main');
    if (!main) return;
    main.style.overflow = 'hidden';
    setTimeout(() => { main.style.overflow = 'scroll'; }, 1);
  }, [books.length]);

  const showBookListLoading = contextLoading && books.length === 0;
  const showBookListError = !!contextError;
  const showBookListContent = !showBookListLoading && !showBookListError;

  return (
    <Layout onRefresh={refreshBooks}>
      <BooksTour />
      <Box
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          flexShrink: 0,
          px: 2,
          position: 'sticky',
          top: 0,
          zIndex: 1,
          bgcolor: 'background.default',
        }}
      >
        <Tabs
          value={effectiveTab}
          onChange={handleBookListTabChange}
          aria-label="books view tabs"
        >
          <Tab label="Book List" />
          <Tab label="Club" />
        </Tabs>
      </Box>
      <Box
        sx={{
          p: 2,
          overflowX: 'hidden',
        }}
      >
        {effectiveTab === CLUB_TAB_INDEX && <ClubBooksTab />}
        {effectiveTab === 0 && (
          <>
            {showBookListLoading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            )}
            {showBookListError && (
              <Alert severity="error" action={
                <Button color="inherit" size="small" onClick={refreshBooks}>
                  Retry
                </Button>
              }>
                {contextError}
              </Alert>
            )}
            {showBookListContent && (
              <>
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
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <Button
              variant="outlined"
              startIcon={<ExploreIcon />}
              onClick={() => navigate('/books/discover')}
              sx={{
                display: { xs: 'none', md: 'flex' },
              }}
            >
              Discover
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setAddBookOpen(true)}
              data-tour="add_book_button"
              sx={{ 
                display: { xs: 'none', md: 'flex' }
              }}
            >
              Add Book
            </Button>
          </Box>
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
                <Box
                    data-tour="books-search"
                    sx={{ 
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

            {/* Filter toggle and Per Page */}
            <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
                <Button 
                    startIcon={<FilterListIcon />}
                    endIcon={showFilters ? <CloseIcon fontSize="small" /> : null}
                    onClick={toggleFilters}
                    color={showFilters || filters.theme !== 'all' || filters.status !== 'all' || filters.suggestedBy !== 'all' || (filters.listScope ?? 'backlog') !== 'backlog' ? "primary" : "inherit"}
                    data-tour="books-filter"
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
                        <InputLabel id="book-list-view-label">View</InputLabel>
                        <Select
                            labelId="book-list-view-label"
                            value={filters.listScope ?? 'backlog'}
                            onChange={handleListScopeChange}
                            label="View"
                            sx={{ borderRadius: 2 }}
                        >
                            <MenuItem value="backlog">Bookclub Backlog</MenuItem>
                            <MenuItem value="suggested">All Suggested</MenuItem>
                            <MenuItem value="bookmarked">Bookmarked</MenuItem>
                        </Select>
                    </FormControl>
                    {themesEnabled && (
                        <FormControl sx={{ minWidth: 200 }} size="small">
                            <InputLabel>Theme Filter</InputLabel>
                            <Select
                                value={filters.theme}
                                onChange={handleThemeChange}
                                label="Theme Filter"
                                sx={{ borderRadius: 2 }}
                            >
                                <MenuItem value="all">All Themes</MenuItem>
                                {themeOptions.map((themeOption) => (
                                  <MenuItem key={themeOption} value={themeOption}>
                                    {themeOption}
                                  </MenuItem>
                                ))}
                                <MenuItem value="no-theme">No Theme</MenuItem>
                            </Select>
                        </FormControl>
                    )}
                
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

                    <FormControl sx={{ minWidth: 220 }} size="small">
                        <InputLabel>Suggested By</InputLabel>
                        <Select
                            value={filters.suggestedBy || 'all'}
                            onChange={handleSuggestedByChange}
                            label="Suggested By"
                            sx={{ borderRadius: 2 }}
                        >
                            <MenuItem value="all">All members</MenuItem>
                            {suggestedByFilterUnknown && (
                              <MenuItem value={filters.suggestedBy}>
                                Former / unknown member
                              </MenuItem>
                            )}
                            {sortedClubMembers.map((member) => (
                              <MenuItem key={member.userId} value={member.userId}>
                                {member.user?.displayName || member.user?.email || member.userId}
                              </MenuItem>
                            ))}
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
          {booksListSummaryLine}
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
            data-tour="books-table"
            sx={{ 
                borderRadius: 3,
                mb: 2,
                border: '1px solid',
                borderColor: 'divider',
                overflowX: 'auto',
                overflowY: 'visible'
            }}
        >
          <Table aria-label="books table">
            <TableHead data-tour="books-table-header">
              <TableRow sx={{ backgroundColor: 'action.hover' }}>
                <TableCell>Cover</TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sort.field === 'title'}
                    direction={sort.field === 'title' ? sort.direction : 'asc'}
                    onClick={() => handleSort('title')}
                  >
                    Title
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sort.field === 'author'}
                    direction={sort.field === 'author' ? sort.direction : 'asc'}
                    onClick={() => handleSort('author')}
                  >
                    Author
                  </TableSortLabel>
                </TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sort.field === 'likes'}
                    direction={sort.field === 'likes' ? sort.direction : 'asc'}
                    onClick={() => handleSort('likes', 'desc')}
                  >
                    Likes
                  </TableSortLabel>
                </TableCell>
                <TableCell>Theme</TableCell>
                <TableCell>Genre</TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sort.field === 'discussionDate'}
                    direction={sort.field === 'discussionDate' ? sort.direction : 'asc'}
                    onClick={() => handleSort('discussionDate')}
                  >
                    Discussion Date
                  </TableSortLabel>
                </TableCell>
                <TableCell>My Progress</TableCell>
                <TableCell>
                  <TableSortLabel
                    active={sort.field === 'createdAt'}
                    direction={sort.field === 'createdAt' ? sort.direction : 'desc'}
                    onClick={() => handleSort('createdAt', 'desc')}
                  >
                    Suggested At
                  </TableSortLabel>
                </TableCell>
                <TableCell>Suggested By</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {books.map((book, index) => (
                <TableRow
                  key={book.id}
                  onClick={() => handleRowClick(book)}
                  data-tour={index === 0 ? 'books-row' : undefined}
                  sx={{ 
                      '&:last-child td, &:last-child th': { border: 0 },
                      '&:hover': { backgroundColor: 'action.hover' },
                      transition: 'background-color 0.2s',
                      cursor: 'pointer'
                  }}
                >
                  <TableCell>
                    <Avatar
                      src={
                        book.coverImage
                          ? setOpenLibraryCoverSize(book.coverImage, OL_COVER_SIZE.M)
                          : undefined
                      }
                      alt={book.title}
                      variant="rounded"
                      sx={bookCoverAvatarSx({
                        width: 60,
                        height: 85,
                        boxShadow: 2,
                        borderRadius: 1,
                      })}
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
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <IconButton
                        size="small"
                        onClick={(event) => handleToggleLike(event, book)}
                        color={book.isLiked ? 'primary' : 'default'}
                        disabled={loadingLikes[book.id]}
                        data-tour={index === 0 ? 'books-like' : undefined}
                      >
                        {book.isLiked ? <ThumbUpIcon fontSize="small" /> : <ThumbUpOffAltIcon fontSize="small" />}
                      </IconButton>
                      <Typography variant="body2">{book.likesCount || 0}</Typography>
                    </Box>
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
                        label={!book.chosenForBookclub ?
                          'Not selected for reading' :
                          book.progress?.status === 'finished' ? 'Finished' :
                          book.progress?.status === 'reading' ? 'Reading' :
                          'Not Started'}
                        size="small"
                        color={!book.chosenForBookclub ? 'default' :
                          book.progress?.status === 'finished' ? 'success' :
                          book.progress?.status === 'reading' ? 'primary' :
                          'default'}
                        variant={!book.chosenForBookclub ? "outlined" : (book.progress?.status ? "filled" : "outlined")}
                      />
                      {book.chosenForBookclub && (
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleProgressUpdate(book);
                          }}
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
                      )}
                      {!book.chosenForBookclub && canManageMeetings && (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleChooseForReading(book);
                          }}
                          sx={{ alignSelf: 'flex-start', textTransform: 'none' }}
                        >
                          Choose for reading
                        </Button>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" color="text.secondary">
                      {formatCreatedDate(book.createdAt || book.created_at)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {book.uploader?.displayName || book.uploadedBy || book.uploaded_by || 'Unknown'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleEditBook(book);
                      }}
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
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2, pb: { xs: 8, md: 0 } }}>
            <Pagination
              count={totalPages}
              page={pagination.page}
              onChange={handlePageChange}
              color="primary"
            />
          </Box>
        )}

        {/* Discover — centered bar (mobile) */}
        <Button
          variant="contained"
          startIcon={<ExploreIcon />}
          aria-label="discover books"
          onClick={() => navigate('/books/discover')}
          sx={{
            display: { xs: 'inline-flex', md: 'none' },
            position: 'fixed',
            bottom: 'calc(72px + env(safe-area-inset-bottom))',
            left: '50%',
            transform: 'translateX(-50%)',
            // minWidth: 200,
            // maxWidth: 'min(92vw, 320px)',
            width: '50%',
            py: 1.25,
            px: 2,
            borderRadius: 999,
            fontWeight: 700,
            textTransform: 'none',
            boxShadow: 4,
            bgcolor: '#e65100',
            color: '#fff',
            '&:hover': { bgcolor: '#ef6c00' },
          }}
        >
          Discover
        </Button>
        <Fab
          color="primary"
          aria-label="add book"
          onClick={() => setAddBookOpen(true)}
          data-tour="add_book_mobile_button"
          sx={{
            position: 'fixed',
            bottom: 'calc(72px + env(safe-area-inset-bottom))',
            right: 24,
            display: { xs: 'flex', md: 'none' }
          }}
        >
          <AddIcon />
        </Fab>
              </>
            )}
          </>
        )}
      </Box>

      <AddBookForm
        open={addBookOpen}
        onClose={handleCloseForm}
        onBookAdded={handleBookAdded}
        onBookDeleted={handleBookDeleted}
        editingBook={editingBook}
      />
      <MeetingForm
        open={meetingFormOpen}
        onClose={handleMeetingFormClose}
        onSave={handleMeetingSaved}
        initialBook={meetingFormBook}
      />
      <BookInfoDialog
        open={isInfoOpen}
        onClose={handleInfoClose}
        book={selectedBook}
        discussionDate={selectedBook ? meetingDates[selectedBook.id] : null}
        onToggleLike={selectedBook ? handleToggleLike : undefined}
        isLikeLoading={selectedBook ? loadingLikes[selectedBook.id] : false}
        saveBookProgress={updateBookProgress}
        onSuperLikeToggle={selectedBook && currentClub?.id ? handleSuperLikeToggle : undefined}
        isSuperLikeLoading={selectedBook ? !!loadingSuperLikes[selectedBook.id] : false}
      />
    </Layout>
  );
};

export default BookList;
