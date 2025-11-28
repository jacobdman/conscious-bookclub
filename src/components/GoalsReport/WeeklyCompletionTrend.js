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
        {weeklyTrend && weeklyTrend.length === 0 
          ? "Not enough data (need at least 2 complete weeks)"
          : "No weekly trend data available"}
      </Typography>
    );
  }

  // Format data for chart - keep chronological order (oldest first, most recent on right)
  // The data comes in chronological order (oldest first), which is what we want
  const data = weeklyTrend.map((week, index) => {
    const weekStart = new Date(week.weekStart);
    const weekEnd = new Date(week.weekEnd);
    const startDateStr = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endDateStr = weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    return {
      week: startDateStr, // Use start date as the label
      weekLabel: `Week ${index + 1}`, // Keep for tooltip if needed
      completionRate: parseFloat(week.completionRate.toFixed(1)),
      dateRange: `${startDateStr} - ${endDateStr}`,
      weekStart: weekStart,
      weekEnd: weekEnd,
    };
  });

  return (
    <Box sx={{ width: '100%', height: 300 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="week" 
            angle={-45} 
            textAnchor="end" 
            height={100}
            tick={{ fontSize: 11 }}
          />
          <YAxis domain={[0, 100]} />
          <Tooltip 
            formatter={(value) => [`${value}%`, 'Completion Rate']}
            labelFormatter={(label, payload) => {
              if (payload && payload[0]) {
                return `Week: ${payload[0].payload.dateRange}`;
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

