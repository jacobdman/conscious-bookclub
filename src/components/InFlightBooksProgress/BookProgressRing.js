import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

const BookProgressRing = ({ value, size = 70 }) => {
  // Ensure value is between 0 and 100
  // avgPercent comes as 0-100 from the backend
  const normalizedValue = Math.min(100, Math.max(0, value || 0));
  
  // Determine color based on completion percentage
  const getColor = (val) => {
    if (val >= 80) return 'success';
    if (val >= 50) return 'warning';
    return 'error';
  };

  return (
    <Box
      sx={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
      }}
    >
      <CircularProgress
        variant="determinate"
        value={normalizedValue}
        size={size}
        thickness={5}
        color={getColor(normalizedValue)}
        sx={{
          '& .MuiCircularProgress-circle': {
            strokeLinecap: 'round',
          },
        }}
      />
      <Box
        sx={{
          top: 0,
          left: 0,
          bottom: 0,
          right: 0,
          position: 'absolute',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Typography
          variant="caption"
          component="div"
          color="text.primary"
          sx={{
            fontSize: size * 0.18,
            fontWeight: 700,
            lineHeight: 1,
          }}
        >
          {Math.round(normalizedValue)}%
        </Typography>
      </Box>
    </Box>
  );
};

export default BookProgressRing;

