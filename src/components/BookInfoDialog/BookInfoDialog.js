import React, { useState, useEffect, useCallback } from 'react';
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
import { getDiscoverStats } from 'services/books/discover.service';

const BookInfoDialog = ({
  open,
  onClose,
  book,
  discussionDate,
  onToggleLike,
  isLikeLoading,
  saveBookProgress,
  onBookProgressUpdated,
  /** When set, shows super-like control with confirmation (book list). */
  onSuperLikeToggle,
  isSuperLikeLoading = false,
}) => {
  const { user } = useAuth();
  const { currentClub } = useClubContext();
  const [remainingSuperLikes, setRemainingSuperLikes] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [superConfirm, setSuperConfirm] = useState({ open: false, intent: 'add' });

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
    if (!open || !onSuperLikeToggle) {
      setRemainingSuperLikes(null);
      return;
    }
    loadStats();
  }, [open, book?.id, onSuperLikeToggle, loadStats]);

  const handleSuperLikeClick = (event, b) => {
    event?.stopPropagation?.();
    if (!onSuperLikeToggle || !b) return;
    setSuperConfirm({
      open: true,
      intent: b.isSuperLiked ? 'remove' : 'add',
    });
  };

  const handleCloseSuperConfirm = () => {
    setSuperConfirm((s) => ({ ...s, open: false }));
  };

  const handleConfirmSuperLike = async () => {
    if (!book || !onSuperLikeToggle) return;
    const shouldSuperLike = superConfirm.intent === 'add';
    try {
      const result = await onSuperLikeToggle(book.id, shouldSuperLike);
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

  if (!book) return null;

  const rem =
    remainingSuperLikes == null ? null : Math.max(0, remainingSuperLikes);
  const afterRemoveRemaining =
    superConfirm.intent === 'remove' && rem != null ? rem + 1 : rem;

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
              {book.title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {book.author || 'Unknown Author'}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small" aria-label="Close">
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: 0 }}>
          <BookInfoContent
            book={book}
            discussionDate={discussionDate}
            onToggleLike={onToggleLike}
            isLikeLoading={isLikeLoading}
            saveBookProgress={saveBookProgress}
            onBookProgressUpdated={onBookProgressUpdated}
            onSuperLikeClick={onSuperLikeToggle ? handleSuperLikeClick : undefined}
            isSuperLikeLoading={isSuperLikeLoading}
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
                      Super liking uses one. Are you sure you want to super like &ldquo;{book.title}
                      &rdquo;?
                    </>
                  ) : (
                    <>Are you sure you want to super like &ldquo;{book.title}&rdquo;?</>
                  )}
                </Typography>
              ) : (
                <Box>
                  <Typography variant="body2" color="text.secondary" component="div">
                    {afterRemoveRemaining != null ? (
                      <>
                        After removing your super like from &ldquo;{book.title}&rdquo;, you will have{' '}
                        <strong>{afterRemoveRemaining}</strong> super{' '}
                        {afterRemoveRemaining === 1 ? 'like' : 'likes'} remaining.
                      </>
                    ) : (
                      <>You are about to remove your super like from &ldquo;{book.title}&rdquo;.</>
                    )}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                    {book.chosenForBookclub ? (
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
              isSuperLikeLoading ||
              statsLoading ||
              (superConfirm.intent === 'add' && rem === 0)
            }
          >
            {isSuperLikeLoading ? <CircularProgress size={22} color="inherit" /> : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default BookInfoDialog;
