import React from 'react';
import {
  Box,
  Typography,
  Avatar,
  Badge,
} from '@mui/material';

const getRankLabel = (rank) => {
  if (rank === 1) return '1st';
  if (rank === 2) return '2nd';
  if (rank === 3) return '3rd';
  return `${rank}th`;
};

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
    return rankA - rankB;
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
            <Badge
              badgeContent={getRankLabel(rank)}
              color="primary"
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              sx={{
                '& .MuiBadge-badge': {
                  fontSize: '0.7rem',
                  minWidth: '30px',
                  height: '20px',
                  borderRadius: '10px',
                },
              }}
            >
              <Avatar
                src={entry.user.photoUrl}
                sx={{
                  width: 64,
                  height: 64,
                  border: entry.rank <= 3 ? '3px solid' : 'none',
                  borderColor:
                    entry.rank === 1 ? 'gold' :
                    entry.rank === 2 ? 'silver' :
                    entry.rank === 3 ? '#CD7F32' : 'transparent',
                }}
              >
                {entry.user.displayName?.charAt(0) || '?'}
              </Avatar>
            </Badge>
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

