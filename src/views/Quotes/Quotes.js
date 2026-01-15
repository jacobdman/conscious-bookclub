import React, { useCallback, useEffect, useMemo, useState } from 'react';
// UI
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
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
  setFeaturedQuote,
} from 'services/quotes/quotes.service';

const emptyForm = {
  quote: '',
  author: '',
  bookId: '',
};

const Quotes = () => {
  const { user } = useAuth();
  const { currentClub } = useClubContext();

  const [quotes, setQuotes] = useState([]);
  const [featuredQuoteId, setFeaturedQuoteId] = useState(null);
  const [selectedBook, setSelectedBook] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const isAdmin = useMemo(
    () => currentClub && ['owner', 'admin'].includes(currentClub.role),
    [currentClub],
  );

  const loadData = useCallback(async () => {
    if (!user || !currentClub) return;
    setLoading(true);
    setError(null);
    try {
      const [quotesResponse, featuredResponse] = await Promise.all([
        getQuotes(user.uid, currentClub.id),
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
  }, [user, currentClub]);

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
          </Stack>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress size={28} />
            </Box>
          ) : quotes.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No quotes yet.
            </Typography>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small" sx={{ minWidth: 640 }}>
                <TableHead>
                  <TableRow>
                    <TableCell>Quote</TableCell>
                    <TableCell>Author</TableCell>
                    <TableCell>Book</TableCell>
                    <TableCell>Added By</TableCell>
                    {isAdmin && <TableCell align="right">Actions</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {quotes.map((quote) => {
                    const isFeatured = featuredQuoteId === quote.id;
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
