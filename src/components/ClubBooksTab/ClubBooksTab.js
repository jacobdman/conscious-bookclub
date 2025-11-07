import React from 'react';
import { Box, Typography } from '@mui/material';
import InFlightBooksProgress from 'components/InFlightBooksProgress';
import FinishedBooksLeaderboard from 'components/FinishedBooksLeaderboard';

const ClubBooksTab = () => {
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h4" gutterBottom>
        Club Books
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        See how everyone is progressing on our current books and check out the reading leaderboard!
      </Typography>
      
      <Box sx={{ mb: 4 }}>
        <InFlightBooksProgress />
      </Box>
      
      <Box>
        <FinishedBooksLeaderboard />
      </Box>
    </Box>
  );
};

export default ClubBooksTab;
