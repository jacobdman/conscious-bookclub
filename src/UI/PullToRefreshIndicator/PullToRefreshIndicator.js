import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

/**
 * Visual indicator for pull-to-refresh gesture.
 * @param {Object} props
 * @param {number} props.pullProgress - 0 to 1, how far the user has pulled
 * @param {boolean} props.isRefreshing - true while refresh is in progress
 * @param {'top' | 'bottom'} props.direction - where the indicator is positioned
 */
const PullToRefreshIndicator = ({ pullProgress, isRefreshing, direction = 'top' }) => {
  const show = pullProgress > 0 || isRefreshing;
  if (!show) return null;

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
        py: 1.5,
        flexShrink: 0,
        order: direction === 'top' ? -1 : 1,
      }}
    >
      <CircularProgress
        size={24}
        variant={isRefreshing ? 'indeterminate' : 'determinate'}
        value={isRefreshing ? undefined : pullProgress * 100}
        sx={{ flexShrink: 0 }}
      />
      <Typography variant="caption" color="text.secondary">
        {isRefreshing ? 'Refreshing...' : 'Release to refresh'}
      </Typography>
    </Box>
  );
};

export default PullToRefreshIndicator;
