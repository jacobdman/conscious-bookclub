import React from 'react';
// UI
import { Chip } from '@mui/material';
// Utils
import { getGoalTypeColor, getGoalTypeLabel } from 'utils/goalHelpers';

const GoalTypeChip = ({ goal, size = 'small', variant = 'outlined', sx = {} }) => {
  if (!goal) return null;

  return (
    <Chip
      label={getGoalTypeLabel(goal)}
      color={getGoalTypeColor(goal.type)}
      size={size}
      variant={variant}
      sx={sx}
    />
  );
};

export default GoalTypeChip;
