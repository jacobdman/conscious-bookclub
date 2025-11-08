import React from 'react';
import { Box, Typography, Avatar, Divider } from '@mui/material';

const TopPerformersByCategory = ({ topPerformers }) => {
  if (!topPerformers) {
    return (
      <Typography variant="body2" color="text.secondary" textAlign="center">
        No top performer data available
      </Typography>
    );
  }

  const categories = [
    {
      key: 'mostConsistent',
      title: 'Most Consistent',
      value: topPerformers.mostConsistent,
      formatValue: (val) => `${val.toFixed(1)}%`,
      emoji: '🥇',
    },
    {
      key: 'topMetricEarner',
      title: 'Top Metric Earner',
      value: topPerformers.topMetricEarner,
      formatValue: (val) => `${val.toFixed(1)}%`,
      emoji: '🏆',
    },
    {
      key: 'milestoneMaster',
      title: 'Milestone Master',
      value: topPerformers.milestoneMaster,
      formatValue: (val) => `${val}`,
      emoji: '⭐',
    },
    {
      key: 'streakChampion',
      title: 'Streak Champion',
      value: topPerformers.streakChampion,
      formatValue: (val) => `${val}`,
      emoji: '🔥',
    },
  ];

  return (
    <Box>
      {categories.map((category, index) => (
        <React.Fragment key={category.key}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              py: 2,
              px: 1,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 140 }}>
                <Typography
                  component="span"
                  sx={{
                    fontSize: '1.2rem',
                    lineHeight: 1,
                  }}
                >
                  {category.emoji}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 500,
                    color: 'text.secondary',
                    fontSize: '0.875rem',
                  }}
                >
                  {category.title}
                </Typography>
              </Box>
              {category.value ? (
                <>
                  <Avatar
                    src={category.value.user?.photoUrl}
                    sx={{
                      width: 32,
                      height: 32,
                      flexShrink: 0,
                    }}
                  >
                    {category.value.user?.displayName?.charAt(0) || '?'}
                  </Avatar>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      flex: 1,
                      minWidth: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {category.value.user?.displayName || 'Unknown'}
                  </Typography>
                  <Typography
                    variant="body1"
                    color="primary"
                    sx={{
                      fontWeight: 700,
                      minWidth: 60,
                      textAlign: 'right',
                    }}
                  >
                    {category.formatValue(category.value.value)}
                  </Typography>
                </>
              ) : (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ flex: 1 }}
                >
                  No data
                </Typography>
              )}
            </Box>
          </Box>
          {index < categories.length - 1 && <Divider />}
        </React.Fragment>
      ))}
    </Box>
  );
};

export default TopPerformersByCategory;

