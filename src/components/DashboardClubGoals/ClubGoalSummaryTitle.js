import React from 'react';
import { Stack, Typography } from '@mui/material';
import ClubGoalChip from 'components/ClubGoalChip';

const ClubGoalSummaryTitle = ({ clubGoal, collapsed = false, showChip = true }) => (
  <Stack
    direction="row"
    alignItems="center"
    spacing={1}
    sx={{ mb: collapsed ? 0.5 : 1.25 }}
  >
    <Typography
      variant={collapsed ? 'body1' : 'subtitle1'}
      fontWeight="bold"
      sx={{ flex: 1, minWidth: 0, lineHeight: 1.25 }}
    >
      {clubGoal?.title}
    </Typography>
    {showChip && <ClubGoalChip />}
  </Stack>
);

export default ClubGoalSummaryTitle;
