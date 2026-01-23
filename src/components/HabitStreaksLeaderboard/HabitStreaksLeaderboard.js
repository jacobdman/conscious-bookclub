import React from 'react';
import WhatshotIcon from '@mui/icons-material/Whatshot';
// UI
import { Box, Typography } from '@mui/material';
// Components
import ProfileAvatar from 'components/ProfileAvatar';

const HabitStreaksLeaderboard = ({ leaderboard, title, subtitle }) => {
  if (!leaderboard || leaderboard.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" textAlign="center">
        No streak data available
      </Typography>
    );
  }

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
      {leaderboard.map((entry) => {
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
              rank={entry.rank}
              showRankBadge
              showEntryRing
            />
            <Typography variant="caption" sx={{ mt: 1, textAlign: 'center', maxWidth: 80 }}>
              {entry.user.displayName || 'Unknown'}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
              <WhatshotIcon sx={{ fontSize: 16, color: 'orange' }} />
              <Typography variant="caption" color="text.secondary">
                {entry.streak}
              </Typography>
            </Box>
          </Box>
        );
      })}
      </Box>
    </Box>
  );
};

export default HabitStreaksLeaderboard;

