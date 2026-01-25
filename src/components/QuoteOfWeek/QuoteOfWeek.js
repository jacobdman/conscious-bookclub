import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { ArrowForward, Star, StarBorder } from '@mui/icons-material';
// Context
import { useAuth } from 'AuthContext';
import useClubContext from 'contexts/Club';
// Services
import { getFeaturedQuote, likeQuote, unlikeQuote } from 'services/quotes/quotes.service';
// Utils
import { useNavigate } from 'react-router-dom';

const QuoteOfWeek = () => {
  const { user } = useAuth();
  const { currentClub } = useClubContext();
  const navigate = useNavigate();

  const [quoteData, setQuoteData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [liking, setLiking] = useState(false);
  const [error, setError] = useState(null);

  const fallbackQuotes = [
    {
      quote: 'The unexamined life is not worth living.',
      author: 'Socrates',
    },
    {
      quote: 'Courage is knowing what not to fear.',
      author: 'Plato',
    },
    {
      quote: 'We are what we repeatedly do. Excellence, then, is not an act, but a habit.',
      author: 'Aristotle',
    },
  ];
  const fallbackQuote =
    fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)];

  const loadFeaturedQuote = useCallback(async () => {
    if (!user || !currentClub) return;
    setLoading(true);
    setError(null);
    try {
      const response = await getFeaturedQuote(user.uid, currentClub.id);
      setQuoteData(response.quote);
    } catch (err) {
      setError('Unable to load quote of the week');
      console.error('Error loading featured quote', err);
    } finally {
      setLoading(false);
    }
  }, [user, currentClub]);

  useEffect(() => {
    loadFeaturedQuote();
  }, [loadFeaturedQuote]);

  const displayQuote = quoteData || fallbackQuote;
  const usingFallback = !quoteData;
  const likesCount = quoteData?.likesCount ?? 0;

  const handleToggleLike = async () => {
    if (!user || !currentClub || !quoteData?.id) return;
    setLiking(true);
    try {
      const response = quoteData.isLiked
        ? await unlikeQuote(user.uid, currentClub.id, quoteData.id)
        : await likeQuote(user.uid, currentClub.id, quoteData.id);
      setQuoteData((prev) => ({
        ...prev,
        isLiked: response?.liked ?? !prev?.isLiked,
        likesCount: response?.likesCount ?? prev?.likesCount ?? 0,
      }));
    } catch (err) {
      console.error('Error updating quote star', err);
    } finally {
      setLiking(false);
    }
  };

  return (
    <Paper
      sx={{
        p: { xs: 2, sm: 3 },
        textAlign: 'center',
        background: (theme) => {
          const { palette } = theme;
          if (palette.mode !== 'dark') {
            return 'radial-gradient(circle at 50% 40%, #fdf8f1 0%, #e9decf 100%)';
          }
          const glow = alpha(palette.secondary.main, 0.28);
          return `radial-gradient(circle at 50% 40%, ${glow} 0%, ${palette.background.paper} 55%, ${palette.background.default} 100%)`;
        },
        border: (theme) =>
          theme.palette.mode !== 'dark' ? '1px solid #dfd3c3' : `1px solid ${theme.palette.divider}`,
        boxShadow: (theme) =>
          theme.palette.mode !== 'dark' ? '0 6px 24px rgba(0,0,0,0.06)' : theme.shadows[3],
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 2,
          gap: 1,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Quote of the Week
        </Typography>
        <Button
          variant="text"
          onClick={() => navigate('/quotes')}
          size="small"
          endIcon={<ArrowForward fontSize="small" />}
          sx={{ textTransform: 'none', fontWeight: 600, fontSize: '0.95rem' }}
        >
          Manage Quotes
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <CircularProgress size={24} />
        </Box>
      ) : error ? (
        <Typography color="error" variant="body2">
          {error}
        </Typography>
      ) : displayQuote ? (
        <Box sx={{ maxWidth: 640, mx: 'auto' }}>
          {usingFallback && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              No club quotes yet — enjoy a classic:
            </Typography>
          )}
          <Typography
            variant="h6"
            sx={{
              fontStyle: 'italic',
              fontWeight: 500,
              mb: 1,
              lineHeight: 1.4,
            }}
          >
            “{displayQuote.quote}”
          </Typography>
          {displayQuote.author && (
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mt: 0.5 }}>
              {displayQuote.author}
            </Typography>
          )}
          {displayQuote.book && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {displayQuote.book.title}
            </Typography>
          )}
          {!usingFallback && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <IconButton
                  size="small"
                  onClick={handleToggleLike}
                  disabled={liking}
                  aria-label={quoteData?.isLiked ? 'Remove star' : 'Add star'}
                >
                  {quoteData?.isLiked ? (
                    <Star fontSize="small" sx={{ color: 'warning.main' }} />
                  ) : (
                    <StarBorder fontSize="small" sx={{ color: 'text.secondary' }} />
                  )}
                </IconButton>
                <Typography variant="caption" color="text.secondary">
                  {likesCount}
                </Typography>
              </Stack>
            </Box>
          )}
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary">
          No quotes yet. Add one to get started.
        </Typography>
      )}

    </Paper>
  );
};

export default QuoteOfWeek;
