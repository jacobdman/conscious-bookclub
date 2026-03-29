import React, { useState, useLayoutEffect, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Avatar,
  Chip,
  Button,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Close,
  ThumbUp as ThumbUpIcon,
  ThumbUpOffAlt as ThumbUpOffAltIcon,
} from '@mui/icons-material';
import { useAuth } from 'AuthContext';
import BookProgressControls from 'components/BookProgressControls';
import { setOpenLibraryCoverSize, OL_COVER_SIZE } from 'services/openLibraryService';
import { bookCoverAvatarSx } from 'utils/bookCoverDisplay';

const LINE_CLAMP = 3;

const ClampedTextBlock = ({ sectionKey, title, text, emptyLabel }) => {
  const [expanded, setExpanded] = useState(false);
  const [showToggle, setShowToggle] = useState(false);
  const contentRef = useRef(null);

  useEffect(() => {
    setExpanded(false);
    setShowToggle(false);
  }, [sectionKey]);

  const displayText = text?.trim() ? text.trim() : null;
  const body = displayText || emptyLabel;

  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) {
      setShowToggle(false);
      return;
    }
    if (expanded) {
      setShowToggle(true);
      return;
    }
    const id = requestAnimationFrame(() => {
      const node = contentRef.current;
      if (!node) return;
      setShowToggle(node.scrollHeight > node.clientHeight + 2);
    });
    return () => cancelAnimationFrame(id);
  }, [body, expanded, sectionKey]);

  return (
    <Box sx={{ mb: 2, '&:last-of-type': { mb: 0 } }}>
      <Typography variant="subtitle2" gutterBottom>
        {title}
      </Typography>
      <Typography
        ref={contentRef}
        component="div"
        variant="body2"
        color="text.secondary"
        sx={{
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          ...(!expanded && {
            display: '-webkit-box',
            WebkitLineClamp: LINE_CLAMP,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }),
        }}
      >
        {body}
      </Typography>
      {displayText && showToggle && (
        <Button
          type="button"
          variant="text"
          size="small"
          onClick={() => setExpanded((v) => !v)}
          sx={{ mt: 0.5, p: 0, minWidth: 0, textTransform: 'none' }}
        >
          {expanded ? 'Show less' : 'Show more'}
        </Button>
      )}
    </Box>
  );
};

const BookInfoDialog = ({
  open,
  onClose,
  book,
  discussionDate,
  onToggleLike,
  isLikeLoading,
  saveBookProgress,
  onBookProgressUpdated,
}) => {
  const { user } = useAuth();

  if (!book) return null;

  const themes = Array.isArray(book.theme) ? book.theme : book.theme ? [book.theme] : [];
  const description = book.description?.trim();
  const suggesterNotes = (book.suggesterNotes ?? book.suggester_notes ?? '').trim();
  const hasProgress = Boolean(book.chosenForBookclub);
  const likesCount = book.likesCount || 0;
  const isLiked = Boolean(book.isLiked);
  const uploadedBy = book.uploader?.displayName || book.uploadedBy || book.uploaded_by;

  const formatDate = (date) => {
    if (!date) return 'TBD';
    return new Date(date).toLocaleDateString();
  };

  const getStatusLabel = () => {
    if (!hasProgress) return 'Not selected for reading';
    const progressStatus = book.progress?.status || 'not_started';
    if (progressStatus === 'finished') return 'Finished';
    if (progressStatus === 'reading') return 'Reading';
    return 'Not Started';
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen
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
        <Box sx={{ maxWidth: 1200, mx: 'auto', width: '100%' }}>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
          <Avatar
            src={
              book.coverImage
                ? setOpenLibraryCoverSize(book.coverImage, OL_COVER_SIZE.L)
                : undefined
            }
            alt={book.title}
            variant="rounded"
            sx={bookCoverAvatarSx({
              width: 100,
              height: 140,
              borderRadius: 2,
              boxShadow: 2,
            })}
          />
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {themes.length > 0 ? (
                themes.map((theme) => <Chip key={theme} label={theme} size="small" color="primary" />)
              ) : (
                <Chip label="No theme" size="small" variant="outlined" />
              )}
              <Chip label={book.genre || 'No genre'} size="small" variant="outlined" />
            </Box>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
              Discussion date: {formatDate(discussionDate)}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              Suggested by: {uploadedBy || 'Unknown'}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
              <Tooltip title={isLiked ? 'Unlike book' : 'Like book'}>
                <span>
                  <IconButton
                    size="small"
                    onClick={(event) => onToggleLike?.(event, book)}
                    disabled={isLikeLoading || !onToggleLike}
                    color={isLiked ? 'primary' : 'default'}
                    aria-label={isLiked ? 'Unlike book' : 'Like book'}
                  >
                    {isLiked ? <ThumbUpIcon fontSize="small" /> : <ThumbUpOffAltIcon fontSize="small" />}
                  </IconButton>
                </span>
              </Tooltip>
              <Typography variant="caption" color="text.secondary">
                {likesCount} {likesCount === 1 ? 'like' : 'likes'}
              </Typography>
            </Box>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
          About this book
        </Typography>
        <Box sx={{ mb: 1 }}>
          <ClampedTextBlock
            sectionKey={`${book.id}-desc`}
            title="Description"
            text={description}
            emptyLabel="No description available."
          />
          <ClampedTextBlock
            sectionKey={`${book.id}-notes`}
            title="Suggester's notes"
            text={suggesterNotes}
            emptyLabel="None"
          />
        </Box>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" gutterBottom>
          My Progress
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {getStatusLabel()}
        </Typography>
        <BookProgressControls
          user={user}
          bookId={book.id}
          chosenForBookclub={book.chosenForBookclub}
          initialProgress={book.progress}
          saveProgress={saveBookProgress}
          onProgressUpdated={onBookProgressUpdated}
          showStatusLine={false}
        />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="outlined">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default BookInfoDialog;
