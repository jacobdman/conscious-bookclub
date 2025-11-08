import React from 'react';
import { Box, Typography } from '@mui/material';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const ClubGoalTypeDistribution = ({ clubGoalTypeDistribution }) => {
  if (!clubGoalTypeDistribution) {
    return (
      <Typography variant="body2" color="text.secondary" textAlign="center">
        No goal distribution data available
      </Typography>
    );
  }

  const total = (clubGoalTypeDistribution.habit || 0) +
    (clubGoalTypeDistribution.metric || 0) +
    (clubGoalTypeDistribution.milestone || 0) +
    (clubGoalTypeDistribution.oneTime || 0);

  if (total === 0) {
    return (
      <Typography variant="body2" color="text.secondary" textAlign="center">
        No goals found
      </Typography>
    );
  }

  const data = [
    { name: 'Habits', value: clubGoalTypeDistribution.habit || 0 },
    { name: 'Metrics', value: clubGoalTypeDistribution.metric || 0 },
    { name: 'Milestones', value: clubGoalTypeDistribution.milestone || 0 },
    { name: 'One-Time', value: clubGoalTypeDistribution.oneTime || 0 },
  ].filter((item) => item.value > 0);

  return (
    <Box sx={{ width: '100%', height: 300 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default ClubGoalTypeDistribution;

