import React, { useMemo } from 'react';
import { Box, Typography, Tooltip as MUITooltip } from '@mui/material';

/**
 * Heatmap-style visualization with flipped axis
 * Shows weeks as rows, goals as columns, color-coded by completion
 */
const HeatmapView = ({ weeklyBreakdown }) => {
  const { heatmapData, goalLabels } = useMemo(() => {
    if (!weeklyBreakdown || weeklyBreakdown.length === 0) {
      return { heatmapData: [], goalLabels: [] };
    }

    // Get all unique goals across all weeks
    const goalMap = new Map();
    weeklyBreakdown.forEach((week) => {
      week.goals.forEach((goal) => {
        if (!goalMap.has(goal.goalId)) {
          goalMap.set(goal.goalId, {
            goalId: goal.goalId,
            title: goal.title,
          });
        }
      });
    });

    const allGoals = Array.from(goalMap.values());

    // Reverse so most recent week is first (top)
    const reversedBreakdown = [...weeklyBreakdown].reverse();

    // Transform data - each week becomes a row with goal data
    const weekRows = reversedBreakdown.map((week) => {
      const start = new Date(week.weekStart);
      const end = new Date(week.weekEnd);
      const weekLabel = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const weekLabelFull = `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

      const goalData = {};
      allGoals.forEach((goal) => {
        const weekGoal = week.goals.find((g) => g.goalId === goal.goalId);
        goalData[goal.goalId] = weekGoal ? {
          completionPercentage: weekGoal.completionPercentage,
          completed: weekGoal.completed,
          entries: weekGoal.entries,
        } : null;
      });

      return {
        weekLabel,
        weekLabelFull,
        weekStart: week.weekStart,
        weekEnd: week.weekEnd,
        overallCompletion: week.overallCompletionRate,
        goalData,
      };
    });

    return {
      heatmapData: weekRows,
      goalLabels: allGoals,
    };
  }, [weeklyBreakdown]);

  // Get color based on completion percentage
  const getColor = (completionData) => {
    if (!completionData) return '#f0f0f0'; // Gray for no data
    const value = completionData.completionPercentage;
    const completed = completionData.completed;
    
    if (completed || value >= 100) return '#00C49F'; // Green
    if (value >= 50) return '#FFBB28'; // Yellow
    if (value > 0) return '#FF8042'; // Orange
    return '#dc3545'; // Red
  };

  if (!weeklyBreakdown || weeklyBreakdown.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" textAlign="center">
        No weekly breakdown data available
      </Typography>
    );
  }

  return (
    <Box sx={{ width: '100%', overflowX: 'auto' }}>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {/* Goal labels header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
          <Typography
            variant="caption"
            sx={{
              minWidth: 120,
              textAlign: 'right',
              fontSize: '0.75rem',
              fontWeight: 600,
              pr: 1,
            }}
          >
            Week
          </Typography>
          <Box sx={{ display: 'flex', gap: 0.3 }}>
            {goalLabels.map((goal) => (
              <Typography
                key={goal.goalId}
                variant="caption"
                sx={{
                  width: 35,
                  textAlign: 'center',
                  fontSize: '0.7rem',
                  color: 'text.secondary',
                  fontWeight: 500,
                }}
                title={goal.title}
              >
                {goal.title.length > 12 ? goal.title.substring(0, 12) + '...' : goal.title}
              </Typography>
            ))}
          </Box>
        </Box>

        {/* Week rows */}
        {heatmapData.map((week, weekIndex) => (
          <Box key={weekIndex} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography
              variant="caption"
              sx={{
                minWidth: 120,
                textAlign: 'right',
                fontSize: '0.75rem',
                pr: 1,
              }}
              title={week.weekLabelFull}
            >
              {week.weekLabel}
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.3 }}>
              {goalLabels.map((goal) => {
                const completionData = week.goalData[goal.goalId];
                const color = getColor(completionData);
                const tooltipTitle = completionData
                  ? `${goal.title} - ${week.weekLabelFull}: ${completionData.completionPercentage.toFixed(1)}% ${completionData.completed ? '✓ Completed' : '✗ Missed'}`
                  : `${goal.title} - ${week.weekLabelFull}: No data`;

                return (
                  <MUITooltip key={goal.goalId} title={tooltipTitle} arrow>
                    <Box
                      sx={{
                        width: 35,
                        height: 35,
                        backgroundColor: color,
                        borderRadius: '4px',
                        cursor: 'pointer',
                        border: '1px solid',
                        borderColor: 'divider',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        '&:hover': {
                          opacity: 0.8,
                          transform: 'scale(1.1)',
                        },
                      }}
                    >
                      {completionData && (
                        <Typography
                          variant="caption"
                          sx={{
                            fontSize: '0.7rem',
                            color: completionData.completed ? '#fff' : '#000',
                            fontWeight: 600,
                          }}
                        >
                          {completionData.completed ? '✓' : Math.round(completionData.completionPercentage)}
                        </Typography>
                      )}
                    </Box>
                  </MUITooltip>
                );
              })}
            </Box>
          </Box>
        ))}
      </Box>

      {/* Legend */}
      <Box sx={{ display: 'flex', gap: 2, mt: 3, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 20, height: 20, backgroundColor: '#00C49F', borderRadius: '4px', border: '1px solid #ddd' }} />
          <Typography variant="caption">Completed (100%)</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 20, height: 20, backgroundColor: '#FFBB28', borderRadius: '4px', border: '1px solid #ddd' }} />
          <Typography variant="caption">Partial (50-99%)</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 20, height: 20, backgroundColor: '#FF8042', borderRadius: '4px', border: '1px solid #ddd' }} />
          <Typography variant="caption">Some Progress (1-49%)</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 20, height: 20, backgroundColor: '#dc3545', borderRadius: '4px', border: '1px solid #ddd' }} />
          <Typography variant="caption">Not Completed (0%)</Typography>
        </Box>
      </Box>
    </Box>
  );
};

const WeeklyGoalsBreakdownChart = ({ weeklyBreakdown, loading }) => {
  if (loading) {
    return (
      <Typography variant="body2" color="text.secondary" textAlign="center">
        Loading breakdown...
      </Typography>
    );
  }

  return <HeatmapView weeklyBreakdown={weeklyBreakdown} />;
};

export default WeeklyGoalsBreakdownChart;

