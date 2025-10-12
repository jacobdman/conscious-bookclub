import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Checkbox,
  Typography,
} from '@mui/material';

const GoalsCard = ({ goals }) => {
  return (
    <Card>
      <CardContent>
        <Typography variant="h6">Today's Goals</Typography>
        {goals.map((goal) => (
          <Box key={goal.id} sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
            <Checkbox checked={goal.completed} />
            <Typography variant="body2">{goal.text}</Typography>
          </Box>
        ))}
      </CardContent>
    </Card>
  );
};

export default GoalsCard;
