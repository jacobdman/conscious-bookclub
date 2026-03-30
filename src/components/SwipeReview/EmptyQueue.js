import React from 'react';
import { Box, Typography, Button, Stack } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

const MESSAGES = {
  discover: {
    title: "You're all caught up!",
    subtitle: 'Find your next great read — check another queue or add a book.',
  },
  hot: {
    title: 'No books on the edge right now',
    subtitle: 'Nothing is close to the promotion threshold in this queue.',
  },
  champion: {
    title: 'No championed books to review',
    subtitle: 'Super-like a suggested book to champion it.',
  },
  bookmarked: {
    title: 'No bookmarks yet',
    subtitle: 'Swipe down on a card while discovering to save books for later.',
  },
  backlog_review: {
    title: 'Backlog is fresh and up to date!',
    subtitle: 'No books are currently flagged for re-validation.',
  },
};

const OTHER_QUEUES = [
  { id: 'discover', label: 'Discover' },
  { id: 'hot', label: 'Hot Picks' },
  { id: 'champion', label: 'Champion Picks' },
  { id: 'bookmarked', label: 'Bookmarked' },
  { id: 'backlog_review', label: 'Backlog Review' },
];

const EmptyQueue = ({ activeQueue, onSelectQueue }) => {
  const msg = MESSAGES[activeQueue] || MESSAGES.discover;
  const alternatives = OTHER_QUEUES.filter((q) => q !== activeQueue);

  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        px: 3,
        py: 6,
        textAlign: 'center',
      }}
    >
      <CheckCircleOutlineIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
      <Typography variant="h5" gutterBottom fontWeight={600}>
        {msg.title}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 360 }}>
        {msg.subtitle}
      </Typography>
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
        Try another queue
      </Typography>
      <Stack spacing={1} sx={{ width: '100%', maxWidth: 280 }}>
        {alternatives.map((q) => (
          <Button key={q.id} variant="outlined" fullWidth onClick={() => onSelectQueue(q.id)}>
            {q.label}
          </Button>
        ))}
      </Stack>
    </Box>
  );
};

export default EmptyQueue;
