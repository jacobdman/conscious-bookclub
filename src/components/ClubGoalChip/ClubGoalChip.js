import React from 'react';
import { Chip } from '@mui/material';

/**
 * Outlined chip for goals linked to a club goal template.
 */
const ClubGoalChip = ({ size = 'small', sx = {} }) => (
  <Chip
    label="Club goal"
    size={size}
    variant="outlined"
    color="secondary"
    sx={{
      fontWeight: 600,
      ...sx,
    }}
  />
);

export default ClubGoalChip;
