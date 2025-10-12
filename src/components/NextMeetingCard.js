import React from 'react';
import {
  Card,
  CardContent,
  Typography,
} from '@mui/material';

const NextMeetingCard = () => {
  return (
    <Card>
      <CardContent sx={{ py: 1 }}>
        <Typography variant="h6">Next Meeting</Typography>
        <Typography variant="body2">Theme: Creative (Mind)</Typography>
        <Typography variant="body2">Date: May 3, 2025</Typography>
        <Typography variant="body2">Notes: Read/Review other members creative works before the meeting!</Typography>
      </CardContent>
    </Card>
  );
};

export default NextMeetingCard;
