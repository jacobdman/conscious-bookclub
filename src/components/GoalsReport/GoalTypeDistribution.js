import React from 'react';
import { Box, Typography, useTheme, useMediaQuery } from '@mui/material';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const GoalTypeDistribution = ({ goalTypeDistribution }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  if (!goalTypeDistribution) {
    return (
      <Typography variant="body2" color="text.secondary" textAlign="center">
        No goal type data available
      </Typography>
    );
  }

  const total = Object.values(goalTypeDistribution).reduce((sum, count) => sum + count, 0);

  if (total === 0) {
    return (
      <Typography variant="body2" color="text.secondary" textAlign="center">
        No active goals
      </Typography>
    );
  }

  const data = [
    { name: 'Habits', value: goalTypeDistribution.habit || 0 },
    { name: 'Metrics', value: goalTypeDistribution.metric || 0 },
    { name: 'Milestones', value: goalTypeDistribution.milestone || 0 },
    { name: 'One-Time', value: goalTypeDistribution.oneTime || 0 },
  ].filter((item) => item.value > 0);

  if (data.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" textAlign="center">
        No active goals
      </Typography>
    );
  }

  return (
    <Box sx={{ width: '100%', height: { xs: 250, sm: 300 } }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            outerRadius={isMobile ? 60 : 80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend 
            wrapperStyle={{ paddingTop: '10px' }}
            iconSize={isMobile ? 12 : 14}
            fontSize={isMobile ? 12 : 14}
          />
        </PieChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default GoalTypeDistribution;

