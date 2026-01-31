import React from 'react';
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
  LinearProgress
} from '@mui/material';
import {
  ThumbUp as ThumbUpIcon,
  ThumbUpOffAlt as ThumbUpOffAltIcon
} from '@mui/icons-material';

const BookInfoDialog = ({ open, onClose, book, discussionDate }) => {
  if (!book) return null;

  const themes = Array.isArray(book.theme) ? book.theme : (book.theme ? [book.theme] : []);
  const description = book.description?.trim();
  const hasProgress = Boolean(book.chosenForBookclub);
  const progressStatus = book.progress?.status || 'not_started';
  const percentComplete = book.progress?.percentComplete;
  const likesCount = book.likesCount || 0;
  const isLiked = Boolean(book.isLiked);
  const uploadedBy = book.uploader?.displayName || book.uploadedBy || book.uploaded_by;

  const formatDate = (date) => {
    if (!date) return 'TBD';
    return new Date(date).toLocaleDateString();
  };

  const getStatusLabel = () => {
    if (!hasProgress) return 'Not selected for reading';
    if (progressStatus === 'finished') return 'Finished';
    if (progressStatus === 'reading') return 'Reading';
    return 'Not Started';
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Typography variant="h6" component="div">
          {book.title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {book.author || 'Unknown Author'}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
          <Avatar
            src={book.coverImage}
            alt={book.title}
            variant="rounded"
            sx={{ width: 100, height: 140, borderRadius: 2, boxShadow: 2 }}
          />
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {description || 'No description available.'}
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1 }}>
              {themes.length > 0 ? themes.map((theme) => (
                <Chip key={theme} label={theme} size="small" color="primary" />
              )) : (
                <Chip label="No theme" size="small" variant="outlined" />
              )}
              <Chip label={book.genre || 'No genre'} size="small" variant="outlined" />
            </Box>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
              Discussion date: {formatDate(discussionDate)}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              Uploaded by: {uploadedBy || 'Unknown'}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
              {isLiked ? (
                <ThumbUpIcon fontSize="small" color="primary" />
              ) : (
                <ThumbUpOffAltIcon fontSize="small" color="action" />
              )}
              <Typography variant="caption" color="text.secondary">
                {likesCount} {likesCount === 1 ? 'like' : 'likes'}
              </Typography>
            </Box>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Typography variant="subtitle2" gutterBottom>
          My Progress
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {getStatusLabel()}
        </Typography>
        {hasProgress && progressStatus === 'reading' && typeof percentComplete === 'number' && (
          <Box sx={{ mt: 1 }}>
            <LinearProgress variant="determinate" value={percentComplete} sx={{ height: 6, borderRadius: 3 }} />
            <Typography variant="caption" color="text.secondary">
              {Math.round(percentComplete)}% complete
            </Typography>
          </Box>
        )}
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
