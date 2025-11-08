import React from 'react';
import { Box, Typography } from '@mui/material';

const BookCompletionMetric = ({ bookCompletionPercentage }) => {
  if (bookCompletionPercentage === null || bookCompletionPercentage === undefined) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          minHeight: 200,
        }}
      >
        <Typography variant="body2" color="text.secondary" textAlign="center">
          No past books to analyze
        </Typography>
      </Box>
    );
  }

  const roundedPercentage = Math.round(bookCompletionPercentage);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        minHeight: 200,
      }}
    >
      <Typography
        variant="h2"
        component="div"
        sx={{
          fontWeight: 700,
          color: 'primary.main',
          mb: 1,
        }}
      >
        {roundedPercentage}%
      </Typography>
      <Typography variant="body1" color="text.secondary" textAlign="center">
        of past books completed
      </Typography>
      <Typography variant="caption" color="text.secondary" textAlign="center" sx={{ mt: 1 }}>
        At least one member finished each completed book
      </Typography>
    </Box>
  );
};

export default BookCompletionMetric;

