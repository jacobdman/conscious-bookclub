import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { getPlatform } from 'utils/platformHelpers';

const IOS_INDICATOR_HEIGHT = 36;

/**
 * Visual indicator for pull-to-refresh gesture.
 * @param {Object} props
 * @param {number} props.pullProgress - 0 to 1, how far the user has pulled
 * @param {number} [props.pullDistance] - raw pull distance in px (for iOS motion)
 * @param {boolean} props.isRefreshing - true while refresh is in progress
 * @param {'top' | 'bottom'} props.direction - where the indicator is positioned
 */
const PullToRefreshIndicator = ({
  pullProgress,
  pullDistance = 0,
  isRefreshing,
  direction = 'top',
}) => {
  const isIosNative = getPlatform() === 'ios';
  const show = pullProgress > 0 || isRefreshing;
  if (!show) return null;

  if (isIosNative) {
    const revealProgress = Math.min(pullDistance / IOS_INDICATOR_HEIGHT, 1);
    const height = isRefreshing ? IOS_INDICATOR_HEIGHT : revealProgress * IOS_INDICATOR_HEIGHT;

    return (
      <Box
        sx={{
          height: `${height}px`,
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          order: direction === 'top' ? -1 : 1,
          transition: isRefreshing ? 'height 0.2s ease-out' : 'none',
        }}
      >
        <CircularProgress
          size={20}
          thickness={4}
          variant={isRefreshing ? 'indeterminate' : 'determinate'}
          value={isRefreshing ? undefined : pullProgress * 100}
          sx={{ flexShrink: 0, color: 'text.secondary', opacity: revealProgress }}
        />
      </Box>
    );
  }

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
