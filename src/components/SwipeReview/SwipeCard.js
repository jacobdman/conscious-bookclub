import React, { useState, useCallback } from 'react';
import { Box, Typography, Avatar, IconButton } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { getSwipeQueueMeta } from 'constants/swipeQueues';
import { motion, useMotionValue, useTransform, animate, AnimatePresence } from 'framer-motion';
import BookInfoContent from 'components/BookInfoContent';
import SwipeOverlay from './SwipeOverlay';
import { bookCoverImgSx } from 'utils/bookCoverDisplay';
import { setOpenLibraryCoverSize, OL_COVER_SIZE } from 'services/openLibraryService';

const DEAD_ZONE = 32;
const SWIPE_COMMIT = 100;

const cardShellSx = {
  position: 'relative',
  borderRadius: 3,
  overflow: 'hidden',
  boxShadow: 6,
  bgcolor: 'background.paper',
  display: 'flex',
  flexDirection: 'column',
  minHeight: { xs: 'min(76vh, 700px)', sm: 620 },
  maxHeight: 'calc(100vh - 120px)',
};

const faceSx = {
  display: 'flex',
  flexDirection: 'column',
  flex: 1,
  minHeight: 0,
  width: '100%',
};

const SwipeCard = ({ book, activeQueue, isBacklogReview, onCommit, stackIndex = 0, dragDisabled = false }) => {
  const [flipped, setFlipped] = useState(false);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-10, 10]);

  const coverSrc = book.coverImage
    ? setOpenLibraryCoverSize(book.coverImage, OL_COVER_SIZE.L)
    : undefined;

  const [overlayDir, setOverlayDir] = useState('');
  const [overlayStrength, setOverlayStrength] = useState(0);

  const handleDrag = useCallback((_, info) => {
    const lx = info.offset.x;
    const ly = info.offset.y;
    const ax = Math.abs(lx);
    const ay = Math.abs(ly);
    if (ax < DEAD_ZONE && ay < DEAD_ZONE) {
      setOverlayDir('');
      setOverlayStrength(0);
      return;
    }
    let dir = '';
    let mag = 0;
    if (ax > ay) {
      dir = lx > 0 ? 'right' : 'left';
      mag = Math.min(1, ax / 160);
    } else {
      dir = ly < 0 ? 'up' : 'down';
      mag = Math.min(1, ay / 160);
    }
    if (dir === 'up' && book.pool === 'backlog' && !isBacklogReview) {
      setOverlayDir('');
      setOverlayStrength(0);
      return;
    }
    setOverlayDir(dir);
    setOverlayStrength(mag);
  }, [book.pool, isBacklogReview]);

  const resolveAction = (offX, offY) => {
    const ax = Math.abs(offX);
    const ay = Math.abs(offY);
    if (ax < SWIPE_COMMIT && ay < SWIPE_COMMIT) {
      return null;
    }
    if (isBacklogReview) {
      if (ax > ay) {
        return offX > 0 ? 'like' : 'pass';
      }
      return null;
    }
    if (ax > ay) {
      return offX > 0 ? 'like' : 'pass';
    }
    if (offY < 0) {
      return book.pool === 'backlog' ? null : 'super_like';
    }
    return 'bookmark';
  };

  const handleDragEnd = async (_, info) => {
    setOverlayDir('');
    setOverlayStrength(0);
    const offX = info.offset.x;
    const offY = info.offset.y;

    if (Math.abs(offX) < DEAD_ZONE && Math.abs(offY) < DEAD_ZONE) {
      await animate(x, 0, { type: 'spring', stiffness: 400, damping: 30 });
      await animate(y, 0, { type: 'spring', stiffness: 400, damping: 30 });
      return;
    }

    const action = resolveAction(offX, offY);
    if (!action) {
      await animate(x, 0, { type: 'spring', stiffness: 400, damping: 30 });
      await animate(y, 0, { type: 'spring', stiffness: 400, damping: 30 });
      return;
    }

    const exitX = offX > 0 ? 520 : offX < 0 ? -520 : 0;
    const exitY = offY < 0 ? -520 : offY > 0 ? 520 : 0;
    if (Math.abs(offX) >= Math.abs(offY)) {
      await animate(x, exitX, { duration: 0.22 });
    } else {
      await animate(y, exitY, { duration: 0.22 });
    }
    await onCommit(book.id, action);
    x.set(0);
    y.set(0);
  };

  const scale = 1 - stackIndex * 0.035;

  const queuePhase = book._swipePhase ?? activeQueue;
  const queueMeta = getSwipeQueueMeta(queuePhase);

  const frontFace = (
    <Box sx={{ ...faceSx, alignItems: 'center' }}>
      <Box
        sx={{
          flex: '1 1 0',
          minHeight: 240,
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          px: 1.5,
          pb: 0.5,
        }}
      >
        {coverSrc ? (
          <Box
            component="img"
            src={coverSrc}
            alt=""
            sx={bookCoverImgSx({
              width: '100%',
              height: '100%',
              maxHeight: 'min(62vh, 560px)',
              borderRadius: 1,
            })}
          />
        ) : (
          <Avatar
            sx={{
              width: '100%',
              maxWidth: 280,
              height: '100%',
              maxHeight: 'min(62vh, 560px)',
              minHeight: 280,
              borderRadius: 1,
            }}
            variant="rounded"
          >
            {book.title?.[0]}
          </Avatar>
        )}
      </Box>
      <Box sx={{ flexShrink: 0, px: 2, pb: 2.5, pt: 1, width: '100%' }}>
        <Typography variant="h6" align="center" fontWeight={700}>
          {book.title}
        </Typography>
        <Typography variant="body2" color="text.secondary" align="center">
          {book.author || 'Unknown author'}
        </Typography>
      </Box>
    </Box>
  );

  const backFace = (
    <Box
      sx={{
        ...faceSx,
        alignItems: 'stretch',
        overflowY: 'auto',
        overflowX: 'hidden',
        textAlign: 'left',
      }}
    >
      <Box sx={{ px: 2, pt: 0.5, pb: 2 }}>
        <Box sx={{ mb: 2, minWidth: 0 }}>
          <Typography variant="h5" component="div" sx={{ fontWeight: 600, lineHeight: 1.35 }}>
            {book.title || 'Untitled'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {book.author || 'Unknown Author'}
          </Typography>
        </Box>
        <BookInfoContent
          book={book}
          discussionDate={book.discussionDate ?? book.discussion_date}
          showProgress={false}
          showLikeToggle={false}
          sx={{ maxWidth: '100%', mx: 0 }}
        />
      </Box>
    </Box>
  );

  return (
    <Box
      sx={{
        position: 'absolute',
        width: '100%',
        maxWidth: 420,
        left: 0,
        right: 0,
        top: '50%',
        zIndex: 10 - stackIndex,
        transform: `translateY(calc(-50% + ${stackIndex * 6}px)) scale(${scale})`,
        transformOrigin: 'center center',
        pointerEvents: dragDisabled ? 'none' : 'auto',
        opacity: dragDisabled ? 0.85 : 1,
      }}
    >
      <motion.div
        drag={!dragDisabled && !flipped}
        dragConstraints={{ left: -400, right: 400, top: -400, bottom: 400 }}
        dragElastic={0.12}
        style={{ x, y, rotate, position: 'relative' }}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
      >
        <Box sx={cardShellSx}>
          <Box
            role="group"
            aria-label={`Book details. Queue: ${queueMeta.label}.`}
            sx={{
              flexShrink: 0,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 1,
              px: 1,
              pt: 1,
              pb: 0.5,
              zIndex: 2,
              bgcolor: 'background.paper',
            }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                flex: 1,
                minWidth: 0,
                fontWeight: 600,
                lineHeight: 1.35,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              <Box component="span" sx={{ mr: 0.5 }} aria-hidden>
                {queueMeta.emoji}
              </Box>
              {queueMeta.label}
            </Typography>
            <IconButton
              size="small"
              onClick={() => setFlipped((f) => !f)}
              aria-label={flipped ? 'Show cover' : 'Show details'}
            >
              <InfoOutlinedIcon />
            </IconButton>
          </Box>
          <SwipeOverlay direction={overlayDir} strength={overlayStrength} />
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={flipped ? 'back' : 'front'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                minHeight: 0,
                width: '100%',
                position: 'relative',
                zIndex: 1,
              }}
            >
              {flipped ? backFace : frontFace}
            </motion.div>
          </AnimatePresence>
        </Box>
      </motion.div>
    </Box>
  );
};

export default SwipeCard;
