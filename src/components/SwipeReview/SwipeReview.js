import React, { useCallback, useState } from 'react';
import { Box, AppBar, Toolbar, IconButton, CircularProgress, Alert } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { useSwipeReviewContext } from 'contexts/SwipeReview';
import QueueSelector from './QueueSelector';
import SwipeCard from './SwipeCard';
import ActionBar from './ActionBar';
import EmptyQueue from './EmptyQueue';
import SwipeDiscoverInfoDialog from './SwipeDiscoverInfoDialog';

/** Full-bleed safe-area band (paper) so status / home zones match AppBar + ActionBar. */
const safeAreaBandBleedSx = {
  flexShrink: 0,
  alignSelf: 'stretch',
  bgcolor: 'background.paper',
  ml: 'calc(-1 * env(safe-area-inset-left, 0px))',
  mr: 'calc(-1 * env(safe-area-inset-right, 0px))',
  width: 'calc(100% + env(safe-area-inset-left, 0px) + env(safe-area-inset-right, 0px))',
};

const tryHaptic = async (style = 'medium') => {
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    const s =
      style === 'light'
        ? ImpactStyle.Light
        : style === 'heavy'
          ? ImpactStyle.Heavy
          : ImpactStyle.Medium;
    await Haptics.impact({ style: s });
  } catch {
    // not native / unavailable
  }
};

const SwipeReview = () => {
  const {
    queue,
    activeQueue,
    setActiveQueue,
    remainingSuperLikes,
    loading,
    error,
    isBacklogReviewForBook,
    submitAction,
    skipCurrent,
    close,
  } = useSwipeReviewContext();

  const handleCommit = useCallback(
    async (bookId, action) => {
      await tryHaptic('medium');
      try {
        await submitAction(bookId, action);
      } catch {
        await tryHaptic('light');
      }
    },
    [submitAction],
  );

  const onPass = () => {
    const b = queue[0];
    if (b) {
      handleCommit(b.id, 'pass');
    }
  };
  const onLike = () => {
    const b = queue[0];
    if (b) {
      handleCommit(b.id, 'like');
    }
  };
  const onSuperLike = () => {
    const b = queue[0];
    if (b && remainingSuperLikes > 0 && b.pool !== 'backlog') {
      handleCommit(b.id, 'super_like');
    }
  };
  const onBookmark = () => {
    const b = queue[0];
    if (b) {
      handleCommit(b.id, 'bookmark');
    }
  };
  const onStillInterested = () => onLike();
  const onNoLongerInterested = () => onPass();
  const onSkip = () => skipCurrent();

  const current = queue[0];
  const next = queue[1];

  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: (theme) => theme.zIndex.modal + 2,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'background.default',
        boxSizing: 'border-box',
        pl: 'env(safe-area-inset-left, 0px)',
        pr: 'env(safe-area-inset-right, 0px)',
      }}
    >
      <Box sx={{ ...safeAreaBandBleedSx, height: 'env(safe-area-inset-top, 0px)' }} />
      <AppBar
        position="static"
        elevation={0}
        sx={{
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
          color: 'text.primary',
        }}
      >
        <Toolbar>
          <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-start' }}>
            <IconButton edge="start" onClick={() => setHelpOpen(true)} aria-label="How Discover works">
              <InfoOutlinedIcon />
            </IconButton>
          </Box>
          <QueueSelector activeQueue={activeQueue} onSelect={setActiveQueue} />
          <Box sx={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
            <IconButton edge="end" onClick={close} aria-label="Close">
              <CloseIcon />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      <SwipeDiscoverInfoDialog open={helpOpen} onClose={() => setHelpOpen(false)} />

      {error && (
        <Alert severity="error" onClose={() => {}} sx={{ mx: 2, mt: 1 }}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          flex: 1,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          justifyContent: 'center',
          minHeight: 0,
          px: 2,
          overflow: 'hidden',
        }}
      >
        {loading ? (
          <CircularProgress sx={{ alignSelf: 'center', my: 'auto' }} />
        ) : queue.length === 0 ? (
          <EmptyQueue activeQueue={activeQueue} onSelectQueue={setActiveQueue} />
        ) : (
          <Box
            sx={{
              position: 'relative',
              width: '100%',
              maxWidth: 420,
              flex: 1,
              minHeight: 0,
              mx: 'auto',
              alignSelf: 'center',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            {next && (
              <SwipeCard
                key={`stack-${next.id}`}
                book={next}
                isBacklogReview={isBacklogReviewForBook(next)}
                onCommit={async () => {}}
                stackIndex={1}
                dragDisabled
              />
            )}
            {current && (
              <SwipeCard
                key={current.id}
                book={current}
                isBacklogReview={isBacklogReviewForBook(current)}
                onCommit={handleCommit}
                stackIndex={0}
              />
            )}
          </Box>
        )}
      </Box>

      {!loading && queue.length > 0 && (
        <ActionBar
          isBacklogReview={isBacklogReviewForBook(current)}
          superLikeBlocked={Boolean(current?.pool === 'backlog')}
          remainingSuperLikes={remainingSuperLikes}
          onPass={onPass}
          onLike={onLike}
          onSuperLike={onSuperLike}
          onBookmark={onBookmark}
          onStillInterested={onStillInterested}
          onNoLongerInterested={onNoLongerInterested}
          onSkip={onSkip}
        />
      )}
      <Box sx={{ ...safeAreaBandBleedSx, height: 'env(safe-area-inset-bottom, 0px)' }} />
    </Box>
  );
};

export default SwipeReview;
