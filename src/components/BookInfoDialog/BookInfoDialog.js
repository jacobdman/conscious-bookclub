import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Button,
  IconButton,
  CircularProgress,
} from '@mui/material';
import { Close } from '@mui/icons-material';
// UI
import FullscreenDialog from 'UI/FullscreenDialog';
import BookInfoContent from 'components/BookInfoContent';
import { useAuth } from 'AuthContext';
import useClubContext from 'contexts/Club';
import useBooksContext from 'contexts/Books';
import useBookLikeActions from 'hooks/useBookLikeActions';
import { getBook } from 'services/books/books.service';
import { getDiscoverStats } from 'services/books/discover.service';

const BookInfoDialog = ({
  open,
  onClose,
  book,
  discussionDate,
  /** Override default (BooksContext `updateBookProgress`). */
  saveBookProgress: saveBookProgressProp,
  onBookProgressUpdated,
  /** After like/super-like succeeds (e.g. invalidate meetings on dashboard). */
  onAfterBookInteraction,
}) => {
  const { user } = useAuth();
  const { currentClub } = useClubContext();
  const { updateBookProgress } = useBooksContext();
  const saveBookProgress = saveBookProgressProp ?? updateBookProgress;

  const {
    handleToggleLike: runToggleLike,
    handleSuperLikeToggle: runSuperLikeToggle,
    loadingLikes,
    loadingSuperLikes,
  } = useBookLikeActions();

  const [displayBook, setDisplayBook] = useState(null);
  const [remainingSuperLikes, setRemainingSuperLikes] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [superConfirm, setSuperConfirm] = useState({ open: false, intent: 'add' });
  const bookRef = useRef(book);
  bookRef.current = book;

  // Merge parent `book` into local state so a new reference (e.g. dashboard memo) does not
  // replace enriched data, and partial payloads (meetings embed) do not wipe GET /books/:id fields.
  useEffect(() => {
    if (!open) {
      setDisplayBook(null);
      return;
    }
    if (!book) return;
    setDisplayBook((prev) => {
      if (!prev || prev.id !== book.id) return book;
      return { ...prev, ...book };
    });
  }, [open, book]);

  // Same full book record as the book list (description, uploader, suggester notes, etc.).
  useEffect(() => {
    if (!open || !book?.id || !currentClub?.id || !user?.uid) return;
    let cancelled = false;
    const numericId = book.id;
    (async () => {
      try {
        const full = await getBook(currentClub.id, numericId, user.uid);
        if (cancelled) return;
        setDisplayBook((prev) => {
          const latest = bookRef.current;
          const base = prev && prev.id === full.id ? prev : latest;
          if (!full || full.id !== base?.id) return base;
          return {
            ...full,
            progress: base.progress ?? full.progress,
            meetingTheme: base.meetingTheme,
          };
        });
      } catch {
        // keep merged payload from meetings / parent
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, book?.id, currentClub?.id, user?.uid]);

  const loadStats = useCallback(async () => {
    if (!currentClub?.id || !user?.uid) {
      setRemainingSuperLikes(null);
      return;
    }
    setStatsLoading(true);
    try {
      const s = await getDiscoverStats(currentClub.id, user.uid);
      setRemainingSuperLikes(
        typeof s?.remainingSuperLikes === 'number' ? s.remainingSuperLikes : null,
      );
    } catch {
      setRemainingSuperLikes(null);
    } finally {
      setStatsLoading(false);
    }
  }, [currentClub?.id, user?.uid]);

  useEffect(() => {
    if (!open || !currentClub?.id || !user?.uid) {
      setRemainingSuperLikes(null);
      return;
    }
    loadStats();
  }, [open, displayBook?.id, currentClub?.id, user?.uid, loadStats]);

  const handleToggleLike = useCallback(
    async (event, b) => {
      await runToggleLike(event, b);
      setDisplayBook((prev) => {
        if (!prev || prev.id !== b.id) return prev;
        const shouldLike = !b.isLiked;
        return {
          ...prev,
          isLiked: shouldLike,
          likesCount: Math.max(0, (prev.likesCount || 0) + (shouldLike ? 1 : -1)),
        };
      });
      onAfterBookInteraction?.();
    },
    [runToggleLike, onAfterBookInteraction],
  );

  const handleSuperLikeToggle = useCallback(
    async (bookId, shouldSuperLike) => {
      const result = await runSuperLikeToggle(bookId, shouldSuperLike);
      setDisplayBook((prev) => {
        if (!prev || prev.id !== bookId) return prev;
        const delta = shouldSuperLike ? 1 : -1;
        return {
          ...prev,
          isSuperLiked: shouldSuperLike,
          superLikesCount: Math.max(0, (prev.superLikesCount || 0) + delta),
        };
      });
      onAfterBookInteraction?.();
      return result;
    },
    [runSuperLikeToggle, onAfterBookInteraction],
  );

  const handleSuperLikeClick = (event, b) => {
    event?.stopPropagation?.();
    if (!currentClub?.id || !b) return;
    setSuperConfirm({
      open: true,
      intent: b.isSuperLiked ? 'remove' : 'add',
    });
  };

  const handleCloseSuperConfirm = () => {
    setSuperConfirm((s) => ({ ...s, open: false }));
  };

  const handleConfirmSuperLike = async () => {
    const b = displayBook ?? book;
    if (!b) return;
    const shouldSuperLike = superConfirm.intent === 'add';
    try {
      const result = await handleSuperLikeToggle(b.id, shouldSuperLike);
      if (result && typeof result.remainingSuperLikes === 'number') {
        setRemainingSuperLikes(result.remainingSuperLikes);
      } else {
        await loadStats();
      }
      handleCloseSuperConfirm();
    } catch {
      // Error surfaced globally; keep dialog open so user can retry or cancel
    }
  };

  if (!open) return null;
  const effectiveBook = displayBook ?? book;
  if (!effectiveBook) return null;

  const rem =
    remainingSuperLikes == null ? null : Math.max(0, remainingSuperLikes);
  const afterRemoveRemaining =
    superConfirm.intent === 'remove' && rem != null ? rem + 1 : rem;

  const likeLoading = !!loadingLikes[effectiveBook.id];
  const superLikeLoading = !!loadingSuperLikes[effectiveBook.id];

  return (
    <>
      <FullscreenDialog
        open={open}
        onClose={onClose}
        PaperProps={{
          sx: {
            backgroundColor: 'background.default',
          },
        }}
      >
        <DialogTitle
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 2,
            pb: 2,
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h5" component="div">
              {effectiveBook.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {effectiveBook.author || 'Unknown Author'}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small" aria-label="Close">
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 0 }}>
          <BookInfoContent
            book={effectiveBook}
            discussionDate={discussionDate}
            onToggleLike={handleToggleLike}
            isLikeLoading={likeLoading}
            saveBookProgress={saveBookProgress}
            onBookProgressUpdated={onBookProgressUpdated}
            onSuperLikeClick={currentClub?.id ? handleSuperLikeClick : undefined}
            isSuperLikeLoading={superLikeLoading}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} variant="outlined">
            Close
          </Button>
        </DialogActions>
      </FullscreenDialog>

      <Dialog open={superConfirm.open} onClose={handleCloseSuperConfirm} maxWidth="xs" fullWidth>
        <DialogTitle>
          {superConfirm.intent === 'add' ? 'Super like this book?' : 'Remove super like?'}
        </DialogTitle>
        <DialogContent>
          {statsLoading && rem == null ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={28} />
            </Box>
          ) : (
            <>
              {superConfirm.intent === 'add' ? (
                <Typography variant="body2" color="text.secondary">
                  {rem != null ? (
                    <>
                      You have <strong>{rem}</strong> super {rem === 1 ? 'like' : 'likes'} remaining.
                      Super liking uses one. Are you sure you want to super like &ldquo;
                      {effectiveBook.title}
                      &rdquo;?
                    </>
                  ) : (
                    <>Are you sure you want to super like &ldquo;{effectiveBook.title}&rdquo;?</>
                  )}
                </Typography>
              ) : (
                <Box>
                  <Typography variant="body2" color="text.secondary" component="div">
                    {afterRemoveRemaining != null ? (
                      <>
                        After removing your super like from &ldquo;{effectiveBook.title}&rdquo;, you will have{' '}
                        <strong>{afterRemoveRemaining}</strong> super{' '}
                        {afterRemoveRemaining === 1 ? 'like' : 'likes'} remaining.
                      </>
                    ) : (
                      <>You are about to remove your super like from &ldquo;{effectiveBook.title}&rdquo;.</>
                    )}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                    {effectiveBook.chosenForBookclub ? (
                      <>
                        This book is selected for reading. Removing your super like will not remove
                        it from the backlog.
                      </>
                    ) : (
                      <>
                        This may cause the book to be removed from the club backlog if it no longer
                        qualifies to stay there.
                      </>
                    )}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Continue?
                  </Typography>
                </Box>
              )}
              {superConfirm.intent === 'add' && rem === 0 && (
                <Typography variant="body2" color="error" sx={{ mt: 1.5 }}>
                  You have no super likes left. Remove a super like from another book first.
                </Typography>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSuperConfirm}>Cancel</Button>
          <Button
            onClick={handleConfirmSuperLike}
            variant="contained"
            color={superConfirm.intent === 'remove' ? 'warning' : 'primary'}
            disabled={
              superLikeLoading ||
              statsLoading ||
              (superConfirm.intent === 'add' && rem === 0)
            }
          >
            {superLikeLoading ? <CircularProgress size={22} color="inherit" /> : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default BookInfoDialog;
