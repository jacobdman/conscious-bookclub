import React from 'react';
// UI
import { Box, Typography } from '@mui/material';
// Components
import ProfileAvatar from 'components/ProfileAvatar';

const HabitConsistencyLeaderboard = ({ leaderboard, title, subtitle }) => {
  if (!leaderboard || leaderboard.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" textAlign="center">
        No leaderboard data available
      </Typography>
    );
  }

  const sortedLeaderboard = [...leaderboard].sort((a, b) => {
    const rankA = a.rank ?? Number.POSITIVE_INFINITY;
    const rankB = b.rank ?? Number.POSITIVE_INFINITY;
    if (rankA !== rankB) {
      return rankA - rankB;
    }
    const scoreA = a.consistencyScore ?? 0;
    const scoreB = b.consistencyScore ?? 0;
    if (scoreB !== scoreA) {
      return scoreB - scoreA;
    }
    const nameA = (a.user.displayName || '').toLowerCase();
    const nameB = (b.user.displayName || '').toLowerCase();
    return nameA.localeCompare(nameB);
  });

  const itemWidth = 100; // minWidth of each item

  return (
    <Box
      sx={{
        width: '100%',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          gap: 0.7,
          overflowX: 'auto',
          overflowY: 'visible',
          pt: 1,
          pb: 1,
          scrollbarWidth: 'none', // Firefox
          '&::-webkit-scrollbar': {
            display: 'none', // Chrome, Safari, Edge
          },
        }}
      >
      {sortedLeaderboard.map((entry, index) => {
        const rank = entry.rank ?? index + 1;
        return (
          <Box
            key={entry.userId}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              position: 'relative',
              minWidth: itemWidth,
              flexShrink: 0,
            }}
          >
            <ProfileAvatar
              user={entry.user}
              size={64}
              rank={rank}
              showRankBadge
              showEntryRing
            />
            <Typography variant="caption" sx={{ mt: 1, textAlign: 'center', maxWidth: 80 }}>
              {entry.user.displayName || 'Unknown'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {entry.consistencyScore.toFixed(1)}%
            </Typography>
          </Box>
        );
      })}
      </Box>
    </Box>
  );
};

export default HabitConsistencyLeaderboard;

