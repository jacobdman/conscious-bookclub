import React from 'react';
import { Chip } from '@mui/material';

/**
 * Outlined chip for paused goals — distinct from filled/warning metric type chips.
 */
const PausedGoalChip = ({ size = 'small', sx = {} }) => (
  <Chip
    label="Paused"
    size={size}
    variant="outlined"
    color="default"
    sx={(theme) => ({
      borderColor: theme.palette.divider,
      color: 'text.secondary',
      bgcolor: 'transparent',
      fontWeight: 600,
      ...sx,
    })}
  />
);

export default PausedGoalChip;
