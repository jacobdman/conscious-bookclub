import React from 'react';
import { Box, Typography } from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { getThemeColor } from './themeColors';

const PastBooksCompletionChart = ({ pastBooksProgress }) => {
  if (!pastBooksProgress || pastBooksProgress.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" textAlign="center">
        No past books to display
      </Typography>
    );
  }

  // Format data for chart
  const truncateTitle = (title, maxLength = 25) => {
    if (title.length <= maxLength) return title;
    return title.substring(0, maxLength - 3) + '...';
  };

  const formatDiscussionDate = (date) => {
    if (!date) return 'N/A';
    const discussionDate = new Date(date);
    return discussionDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const data = pastBooksProgress.map((book) => ({
    id: book.id,
    title: book.title,
    titleShort: truncateTitle(book.title),
    author: book.author,
    discussionDate: formatDiscussionDate(book.discussionDate),
    theme: book.theme,
    avgCompletionRate: parseFloat((book.avgCompletionRate || 0).toFixed(1)),
    finishRate: parseFloat((book.finishRate || 0).toFixed(1)),
    starters: book.starters || 0,
    finishers: book.finishers || 0,
    color: getThemeColor(book.theme),
  }));

  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <Box
          sx={{
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            border: '1px solid #ccc',
            borderRadius: 1,
            p: 1.5,
            boxShadow: 2,
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
            {data.title}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            by {data.author}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Discussion: {data.discussionDate}
          </Typography>
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            Average Completion: {data.avgCompletionRate}%
          </Typography>
          <Typography variant="body2">
            Finished: {data.finishRate}% ({data.finishers} of {data.starters} starters)
          </Typography>
        </Box>
      );
    }
    return null;
  };

  return (
    <Box sx={{ width: '100%', height: Math.max(400, pastBooksProgress.length * 50) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 150, bottom: 5 }}
          barCategoryGap="20%"
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            type="number"
            domain={[0, 100]}
            label={{ value: 'Percentage (%)', position: 'insideBottom', offset: -5 }}
          />
          <YAxis
            type="category"
            dataKey="titleShort"
            width={140}
            tick={{ fontSize: 12 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="avgCompletionRate" name="Completion %" baseValue={0}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default PastBooksCompletionChart;

