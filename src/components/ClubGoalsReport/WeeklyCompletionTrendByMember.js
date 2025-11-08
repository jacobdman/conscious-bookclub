import React, { useMemo } from 'react';
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

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#ff7300'];

const WeeklyCompletionTrendByMember = ({ weeklyTrendByMember }) => {
  // Get unique member names for lines
  const memberNames = useMemo(() => {
    if (!weeklyTrendByMember || weeklyTrendByMember.length === 0) {
      return [];
    }
    const names = new Set();
    weeklyTrendByMember.forEach((week) => {
      week.members.forEach((member) => {
        names.add(member.user.displayName || 'Unknown');
      });
    });
    return Array.from(names);
  }, [weeklyTrendByMember]);

  const chartData = useMemo(() => {
    if (!weeklyTrendByMember || weeklyTrendByMember.length === 0) {
      return [];
    }

    // Get all unique member IDs
    const memberIds = new Set();
    weeklyTrendByMember.forEach((week) => {
      week.members.forEach((member) => {
        memberIds.add(member.userId);
      });
    });

    // Create a map of member data
    const memberMap = new Map();
    Array.from(memberIds).forEach((userId) => {
      const firstWeek = weeklyTrendByMember.find((w) =>
        w.members.some((m) => m.userId === userId),
      );
      if (firstWeek) {
        const member = firstWeek.members.find((m) => m.userId === userId);
        memberMap.set(userId, {
          userId,
          name: member.user.displayName || 'Unknown',
          color: COLORS[memberMap.size % COLORS.length],
        });
      }
    });

    // Transform data for chart
    return weeklyTrendByMember.map((week, index) => {
      const dataPoint = {
        week: `Week ${weeklyTrendByMember.length - index}`,
        date: new Date(week.weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      };

      week.members.forEach((member) => {
        const memberInfo = memberMap.get(member.userId);
        if (memberInfo) {
          dataPoint[memberInfo.name] = parseFloat(member.completionRate.toFixed(1));
        }
      });

      return dataPoint;
    });
  }, [weeklyTrendByMember]);

  if (!weeklyTrendByMember || weeklyTrendByMember.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" textAlign="center">
        No weekly trend data available
      </Typography>
    );
  }

  return (
    <Box sx={{ width: '100%', height: 450 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="week"
            angle={-45}
            textAnchor="end"
            height={80}
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            domain={[0, 100]} 
            ticks={[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]}
          />
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
          {memberNames.map((name, index) => (
            <Line
              key={name}
              type="monotone"
              dataKey={name}
              stroke={COLORS[index % COLORS.length]}
              strokeWidth={2}
              name={name}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default WeeklyCompletionTrendByMember;

