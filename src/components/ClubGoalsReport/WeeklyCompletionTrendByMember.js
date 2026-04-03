import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Box, Typography, Chip, Stack } from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

/** Distinct hues for many overlapping series (cycles if club is huge) */
const MEMBER_LINE_COLORS = [
  '#2563eb',
  '#dc2626',
  '#059669',
  '#d97706',
  '#7c3aed',
  '#db2777',
  '#0d9488',
  '#ea580c',
  '#4f46e5',
  '#65a30d',
  '#0891b2',
  '#be123c',
  '#ca8a04',
  '#475569',
  '#9333ea',
  '#c2410c',
  '#0284c7',
  '#a21caf',
  '#16a34a',
  '#b45309',
  '#1e40af',
  '#9f1239',
  '#0f766e',
  '#7e22ce',
  '#b91c1c',
];

const WeeklyCompletionTrendByMember = ({ weeklyTrendByMember }) => {
  const membersMeta = useMemo(() => {
    if (!weeklyTrendByMember || weeklyTrendByMember.length === 0) {
      return [];
    }

    const byId = new Map();
    weeklyTrendByMember.forEach((week) => {
      week.members.forEach((member) => {
        if (!byId.has(member.userId)) {
          byId.set(member.userId, {
            userId: member.userId,
            name: member.user.displayName || 'Unknown',
          });
        }
      });
    });

    const sorted = Array.from(byId.values()).sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
    );

    return sorted.map((m, i) => ({
      ...m,
      color: MEMBER_LINE_COLORS[i % MEMBER_LINE_COLORS.length],
    }));
  }, [weeklyTrendByMember]);

  /** Members with at least one week > 0%; all-zero lines start deselected */
  const defaultSelectedIds = useMemo(() => {
    if (!weeklyTrendByMember?.length) {
      return new Set();
    }
    const ids = new Set();
    for (const week of weeklyTrendByMember) {
      for (const member of week.members) {
        if (Number(member.completionRate) > 0) {
          ids.add(member.userId);
        }
      }
    }
    return ids;
  }, [weeklyTrendByMember]);

  const [selectedIds, setSelectedIds] = useState(() => new Set());

  useEffect(() => {
    if (membersMeta.length === 0) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(defaultSelectedIds));
  }, [membersMeta, defaultSelectedIds]);

  const toggleMember = useCallback((userId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(membersMeta.map((m) => m.userId)));
  }, [membersMeta]);

  const clearAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const chartData = useMemo(() => {
    if (!weeklyTrendByMember || weeklyTrendByMember.length === 0) {
      return [];
    }

    const nameById = new Map(membersMeta.map((m) => [m.userId, m.name]));

    return weeklyTrendByMember.map((week, index) => {
      const dataPoint = {
        week: `Week ${weeklyTrendByMember.length - index}`,
        date: new Date(week.weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      };

      week.members.forEach((member) => {
        const name = nameById.get(member.userId);
        if (name) {
          dataPoint[name] = parseFloat(member.completionRate.toFixed(1));
        }
      });

      return dataPoint;
    });
  }, [weeklyTrendByMember, membersMeta]);

  const visibleMembers = useMemo(
    () => membersMeta.filter((m) => selectedIds.has(m.userId)),
    [membersMeta, selectedIds],
  );

  if (!weeklyTrendByMember || weeklyTrendByMember.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" textAlign="center">
        No weekly trend data available
      </Typography>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Stack
        direction="row"
        flexWrap="wrap"
        useFlexGap
        spacing={1}
        sx={{ mb: 2, alignItems: 'center' }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ width: '100%', mb: 0.5 }}>
          Tap to show or hide each member
        </Typography>
        {membersMeta.map((m) => {
          const on = selectedIds.has(m.userId);
          return (
            <Chip
              key={m.userId}
              label={m.name}
              size="small"
              onClick={() => toggleMember(m.userId)}
              variant={on ? 'filled' : 'outlined'}
              sx={{
                borderColor: m.color,
                color: on ? 'common.white' : m.color,
                bgcolor: on ? m.color : 'transparent',
                fontWeight: on ? 600 : 500,
                '&:hover': {
                  bgcolor: on ? m.color : 'action.hover',
                  opacity: on ? 0.92 : 1,
                },
              }}
            />
          );
        })}
        {membersMeta.length > 1 && (
          <Chip
            label="All"
            size="small"
            variant="outlined"
            onClick={selectAll}
            sx={{ fontWeight: 600 }}
          />
        )}
        {membersMeta.length > 0 && (
          <Chip label="None" size="small" variant="outlined" onClick={clearAll} sx={{ fontWeight: 600 }} />
        )}
      </Stack>

      <Box sx={{ width: '100%', height: 420 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="week"
              angle={-45}
              textAnchor="end"
              height={72}
              tick={{ fontSize: 11 }}
            />
            <YAxis domain={[0, 100]} ticks={[0, 20, 40, 60, 80, 100]} width={36} tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(value, name) => [`${value}%`, name]}
              labelFormatter={(label, payload) => {
                if (payload && payload[0]) {
                  return `Week: ${payload[0].payload.date}`;
                }
                return label;
              }}
              contentStyle={{ fontSize: 12 }}
            />
            {visibleMembers.map((m) => (
              <Line
                key={m.userId}
                type="monotone"
                dataKey={m.name}
                stroke={m.color}
                strokeWidth={2}
                name={m.name}
                dot={{ r: 3, strokeWidth: 1, fill: m.color }}
                activeDot={{ r: 5 }}
                isAnimationActive={visibleMembers.length <= 8}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </Box>
    </Box>
  );
};

export default WeeklyCompletionTrendByMember;
