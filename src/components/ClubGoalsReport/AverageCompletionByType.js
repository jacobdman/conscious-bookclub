import React from 'react';
import { Box, Typography } from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const AverageCompletionByType = ({ averageCompletionByType }) => {
  if (!averageCompletionByType) {
    return (
      <Typography variant="body2" color="text.secondary" textAlign="center">
        No completion data available
      </Typography>
    );
  }

  const data = [
    {
      name: 'Habits',
      value: parseFloat((averageCompletionByType.habit || 0).toFixed(1)),
    },
    {
      name: 'Metrics',
      value: parseFloat((averageCompletionByType.metric || 0).toFixed(1)),
    },
    {
      name: 'Milestones',
      value: parseFloat((averageCompletionByType.milestone || 0).toFixed(1)),
    },
    {
      name: 'One-Time',
      value: parseFloat((averageCompletionByType.oneTime || 0).toFixed(1)),
    },
  ];

  return (
    <Box sx={{ width: '100%', height: 300 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis domain={[0, 100]} />
          <Tooltip
            formatter={(value) => [`${value}%`, 'Average Completion']}
          />
          <Legend />
          <Bar dataKey="value" fill="#0088FE" name="Completion %" />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default AverageCompletionByType;

