import React from 'react';
import { Box, Typography } from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

const WeeklyCompletionTrend = ({ weeklyTrend }) => {
  if (!weeklyTrend || weeklyTrend.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" textAlign="center">
        No weekly trend data available
      </Typography>
    );
  }

  // Format data for chart - show week labels
  const data = weeklyTrend.map((week, index) => ({
    week: `Week ${weeklyTrend.length - index}`,
    completionRate: parseFloat(week.completionRate.toFixed(1)),
    date: new Date(week.weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }));

  return (
    <Box sx={{ width: '100%', height: 300 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="week" 
            angle={-45} 
            textAnchor="end" 
            height={80}
            tick={{ fontSize: 12 }}
          />
          <YAxis domain={[0, 100]} />
          <Tooltip 
            formatter={(value) => [`${value}%`, 'Completion Rate']}
            labelFormatter={(label, payload) => {
              if (payload && payload[0]) {
                return `Week: ${payload[0].payload.date}`;
              }
              return label;
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="completionRate"
            stroke="#0088FE"
            strokeWidth={2}
            name="Completion %"
            dot={{ r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default WeeklyCompletionTrend;

