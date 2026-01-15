import React, { useCallback, useEffect, useMemo, useState } from 'react';
// UI
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  Typography,
} from '@mui/material';
import { Star, StarBorder } from '@mui/icons-material';
// Context
import { useAuth } from 'AuthContext';
import useClubContext from 'contexts/Club';
// Components
import BookSearch from 'components/BookSearch';
import Layout from 'components/Layout';
// Services
import {
  clearFeaturedQuote,
  createQuote,
  getFeaturedQuote,
  getQuotes,
  likeQuote,
  setFeaturedQuote,
  unlikeQuote,
} from 'services/quotes/quotes.service';

const emptyForm = {
  quote: '',
  author: '',
  bookId: '',
};

const ALL_BOOK_OPTION = { id: 'all', label: 'All books', type: 'all' };
const NO_BOOK_OPTION = { id: 'none', label: 'No book', type: 'none' };
const Quotes = () => {
  const { user } = useAuth();
  const { currentClub } = useClubContext();

  const [quotes, setQuotes] = useState([]);
  const [featuredQuoteId, setFeaturedQuoteId] = useState(null);
  const [selectedBook, setSelectedBook] = useState(null);
  const [showMyQuotes, setShowMyQuotes] = useState(false);
  const [bookFilter, setBookFilter] = useState(ALL_BOOK_OPTION);
  const [sortOption, setSortOption] = useState('recent');
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [likeLoadingIds, setLikeLoadingIds] = useState({});
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const isAdmin = useMemo(
    () => currentClub && ['owner', 'admin'].includes(currentClub.role),
    [currentClub],
  );

  const bookOptions = useMemo(() => {
    const options = new Map();
    quotes.forEach((quote) => {
      if (quote.book) {
        options.set(quote.book.id, quote.book);
      }
    });
    return Array.from(options.values()).sort((a, b) => a.title.localeCompare(b.title));
  }, [quotes]);

  const bookFilterOptions = useMemo(() => {
    return [ALL_BOOK_OPTION, NO_BOOK_OPTION, ...bookOptions];
  }, [bookOptions]);

  const getBookOptionLabel = useCallback((option) => {
    if (!option) return '';
    if (option.type) return option.label;
    return option.author ? `${option.title} by ${option.author}` : option.title;
  }, []);

  const filteredQuotes = useMemo(() => {
    const filtered = quotes.filter((quote) => {
      if (showMyQuotes && quote.createdBy !== user?.uid) {
        return false;
      }
      if (bookFilter?.type === 'none') {
        return !quote.book;
      }
      if (bookFilter?.type !== 'all') {
        return quote.book?.id === bookFilter?.id;
      }
      return true;
    });

    const sorted = [...filtered];

    const compareStrings = (a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' });

    switch (sortOption) {
      case 'quote_asc':
        sorted.sort((a, b) => compareStrings(a.quote || '', b.quote || ''));
        break;
      case 'quote_desc':
        sorted.sort((a, b) => compareStrings(b.quote || '', a.quote || ''));
        break;
      case 'author_asc':
        sorted.sort((a, b) => compareStrings(a.author || '', b.author || ''));
        break;
      case 'author_desc':
        sorted.sort((a, b) => compareStrings(b.author || '', a.author || ''));
        break;
      case 'book_asc':
        sorted.sort((a, b) => compareStrings(a.book?.title || '', b.book?.title || ''));
        break;
      case 'book_desc':
        sorted.sort((a, b) => compareStrings(b.book?.title || '', a.book?.title || ''));
        break;
      case 'added_by_asc':
        sorted.sort((a, b) =>
          compareStrings(
            a.creator?.displayName || a.createdBy || '',
            b.creator?.displayName || b.createdBy || '',
          ),
        );
        break;
      case 'added_by_desc':
        sorted.sort((a, b) =>
          compareStrings(
            b.creator?.displayName || b.createdBy || '',
            a.creator?.displayName || a.createdBy || '',
          ),
        );
        break;
      case 'likes_asc':
        sorted.sort((a, b) => (a.likesCount ?? 0) - (b.likesCount ?? 0));
        break;
      case 'likes_desc':
        sorted.sort((a, b) => (b.likesCount ?? 0) - (a.likesCount ?? 0));
        break;
      default:
        break;
    }

    return sorted;
  }, [quotes, showMyQuotes, bookFilter, user?.uid, sortOption]);

  const loadData = useCallback(async () => {
    if (!user || !currentClub) return;
    setLoading(true);
    setError(null);
    try {
      const sortParam = sortOption.startsWith('likes_') ? sortOption : undefined;
      const [quotesResponse, featuredResponse] = await Promise.all([
        getQuotes(user.uid, currentClub.id, sortParam),
        getFeaturedQuote(user.uid, currentClub.id),
      ]);

      setQuotes(quotesResponse || []);
      setFeaturedQuoteId(featuredResponse?.selectedQuoteId || null);
    } catch (err) {
      setError('Failed to load quotes');
      console.error('Error loading quotes data', err);
    } finally {
      setLoading(false);
    }
  }, [user, currentClub, sortOption]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!user || !currentClub) return;

    const trimmedQuote = form.quote.trim();
    if (!trimmedQuote) {
      setError('Quote text is required');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        quote: trimmedQuote,
        author: form.author.trim() || undefined,
        bookId: form.bookId ? parseInt(form.bookId, 10) : undefined,
      };
      const created = await createQuote(user.uid, currentClub.id, payload);
      setQuotes((prev) => [created, ...prev]);
      setForm(emptyForm);
      setSelectedBook(null);
      setSuccess('Quote added');
    } catch (err) {
      setError('Failed to add quote');
      console.error('Error adding quote', err);
    } finally {
      setSaving(false);
    }
  };

  const handleSetFeatured = async (quoteId) => {
    if (!user || !currentClub || !isAdmin) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await setFeaturedQuote(user.uid, currentClub.id, quoteId);
      setFeaturedQuoteId(response?.selectedQuoteId || null);
      setSuccess('Quote set as Quote of the Week');
    } catch (err) {
      setError('Failed to set quote of the week');
      console.error('Error setting featured quote', err);
    } finally {
      setSaving(false);
    }
  };

  const handleClearFeatured = async () => {
    if (!user || !currentClub || !isAdmin) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await clearFeaturedQuote(user.uid, currentClub.id);
      setFeaturedQuoteId(null);
      setSuccess('Quote of the Week cleared');
    } catch (err) {
      setError('Failed to clear quote of the week');
      console.error('Error clearing featured quote', err);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleLike = async (quoteId, currentlyLiked) => {
    if (!user || !currentClub) return;
    setLikeLoadingIds((prev) => ({ ...prev, [quoteId]: true }));
    setError(null);
    try {
      const response = currentlyLiked
        ? await unlikeQuote(user.uid, currentClub.id, quoteId)
        : await likeQuote(user.uid, currentClub.id, quoteId);
      setQuotes((prev) =>
        prev.map((quote) =>
          quote.id === quoteId
            ? {
              ...quote,
              likesCount: response?.likesCount ?? quote.likesCount ?? 0,
              isLiked: response?.liked ?? !currentlyLiked,
            }
            : quote,
        ),
      );
    } catch (err) {
      setError('Failed to update star');
      console.error('Error updating quote star', err);
    } finally {
      setLikeLoadingIds((prev) => ({ ...prev, [quoteId]: false }));
    }
  };

  return (
    <Layout>
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Typography variant="h5">Quotes</Typography>

        {error && <Alert severity="error">{error}</Alert>}
        {success && <Alert severity="success">{success}</Alert>}

        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>
            Add a Quote
          </Typography>
          <Box component="form" onSubmit={handleSubmit} sx={{ display: 'grid', gap: 2 }}>
            <TextField
              name="quote"
              label="Quote text"
              value={form.quote}
              onChange={handleFormChange}
              multiline
              minRows={3}
              maxRows={10}
              required
              fullWidth
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                name="author"
                label="Quote author (character)"
                value={form.author}
                onChange={handleFormChange}
                helperText="Only add an author if it differs from the book author (e.g., a character) or no book is selected."
                fullWidth
              />
              <BookSearch
                value={selectedBook}
                onChange={(book) => {
                  setSelectedBook(book);
                  setForm((prev) => ({ ...prev, bookId: book ? book.id : '' }));
                }}
                label="Related book"
                placeholder="Search books in this club"
              />
            </Stack>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                type="submit"
                variant="contained"
                disabled={saving}
                sx={{ textTransform: 'none' }}
              >
                {saving ? 'Saving...' : 'Add Quote'}
              </Button>
            </Box>
          </Box>
        </Paper>

        <Paper sx={{ p: 2 }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            spacing={1}
            sx={{ mb: 2 }}
          >
            <Typography variant="subtitle1">Quotes List</Typography>
            {isAdmin && featuredQuoteId && (
              <Button
                size="small"
                variant="outlined"
                onClick={handleClearFeatured}
                disabled={saving}
                sx={{ textTransform: 'none' }}
              >
                Clear Quote of the Week
              </Button>
            )}
            <Button
              size="small"
              variant={showMyQuotes ? 'contained' : 'outlined'}
              onClick={() => setShowMyQuotes((prev) => !prev)}
              disableElevation
              sx={{ textTransform: 'none', whiteSpace: 'nowrap', alignSelf: 'flex-start' }}
            >
              My quotes
            </Button>
            <Autocomplete
              options={bookFilterOptions}
              value={bookFilter}
              onChange={(event, newValue) => setBookFilter(newValue || ALL_BOOK_OPTION)}
              getOptionLabel={getBookOptionLabel}
              isOptionEqualToValue={(option, value) => option?.id === value?.id}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Book"
                  placeholder="Search books"
                  size="small"
                />
              )}
              renderOption={(props, option) => (
                <li {...props} key={option.id}>
                  {getBookOptionLabel(option)}
                </li>
              )}
              sx={{ minWidth: 260, flex: 1 }}
            />
          </Stack>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress size={28} />
            </Box>
          ) : quotes.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No quotes yet.
            </Typography>
          ) : filteredQuotes.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No quotes match the current filters.
            </Typography>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={{ minWidth: 640 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>
                      <TableSortLabel
                        active={sortOption.startsWith('quote_')}
                        direction={sortOption === 'quote_asc' ? 'asc' : 'desc'}
                        onClick={() =>
                          setSortOption((prev) => (prev === 'quote_desc' ? 'quote_asc' : 'quote_desc'))
                        }
                      >
                        Quote
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={sortOption.startsWith('author_')}
                        direction={sortOption === 'author_asc' ? 'asc' : 'desc'}
                        onClick={() =>
                          setSortOption((prev) =>
                            prev === 'author_desc' ? 'author_asc' : 'author_desc',
                          )
                        }
                      >
                        Author
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={sortOption.startsWith('book_')}
                        direction={sortOption === 'book_asc' ? 'asc' : 'desc'}
                        onClick={() =>
                          setSortOption((prev) => (prev === 'book_desc' ? 'book_asc' : 'book_desc'))
                        }
                      >
                        Book
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="center">
                      <TableSortLabel
                        active={sortOption.startsWith('likes_')}
                        direction={sortOption === 'likes_asc' ? 'asc' : 'desc'}
                        onClick={() =>
                          setSortOption((prev) =>
                            prev === 'likes_desc' ? 'likes_asc' : 'likes_desc',
                          )
                        }
                      >
                        Stars
                      </TableSortLabel>
                    </TableCell>
                    <TableCell>
                      <TableSortLabel
                        active={sortOption.startsWith('added_by_')}
                        direction={sortOption === 'added_by_asc' ? 'asc' : 'desc'}
                        onClick={() =>
                          setSortOption((prev) =>
                            prev === 'added_by_desc' ? 'added_by_asc' : 'added_by_desc',
                          )
                        }
                      >
                        Added By
                      </TableSortLabel>
                    </TableCell>
                    {isAdmin && <TableCell align="right">Actions</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredQuotes.map((quote) => {
                    const isFeatured = featuredQuoteId === quote.id;
                    const likesCount = quote.likesCount ?? 0;
                    return (
                      <TableRow key={quote.id} hover>
                        <TableCell sx={{ maxWidth: 320 }}>
                          <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                            “{quote.quote}”
                          </Typography>
                        </TableCell>
                        <TableCell>
                          {quote.author ? (
                            <Typography variant="body2">{quote.author}</Typography>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              —
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {quote.book ? (
                            <Stack spacing={0.25}>
                              <Typography variant="body2">{quote.book.title}</Typography>
                              {quote.book.author && (
                                <Typography variant="caption" color="text.secondary">
                                  {quote.book.author}
                                </Typography>
                              )}
                            </Stack>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              —
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center">
                            <IconButton
                              size="small"
                              onClick={() => handleToggleLike(quote.id, quote.isLiked)}
                              disabled={!!likeLoadingIds[quote.id]}
                              aria-label={quote.isLiked ? 'Remove star' : 'Add star'}
                            >
                              {quote.isLiked ? (
                                <Star fontSize="small" sx={{ color: 'warning.main' }} />
                              ) : (
                                <StarBorder fontSize="small" sx={{ color: 'text.secondary' }} />
                              )}
                            </IconButton>
                            <Typography variant="caption" color="text.secondary">
                              {likesCount}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>
                          {quote.creator?.displayName || quote.createdBy || 'Unknown'}
                        </TableCell>
                        {isAdmin && (
                          <TableCell align="right">
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                              {isFeatured && <Chip size="small" label="Quote of the Week" color="primary" />}
                              {!isFeatured && (
                                <Button
                                  size="small"
                                  variant="outlined"
                                  onClick={() => handleSetFeatured(quote.id)}
                                  disabled={saving}
                                  sx={{ textTransform: 'none' }}
                                >
                                  Set as Quote of the Week
                                </Button>
                              )}
                            </Stack>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Box>
          )}
        </Paper>
      </Box>
    </Layout>
  );
};

export default Quotes;
