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
            createdAt: goal.createdAt,
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

  const gridMinWidth = `calc(var(--label-width) + ${goalLabels.length} * (var(--cell-size) + var(--cell-gap)))`;

  return (
    <Box sx={{ width: '100%', overflowX: 'auto' }}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 0.5,
          minWidth: gridMinWidth,
          width: 'max-content',
          alignItems: 'flex-start',
          mx: 'auto',
          '--cell-size': 'clamp(50px, 4vw, 60px)',
          '--label-width': 'clamp(60px, 8vw, 110px)',
          '--cell-gap': 'clamp(3px, 0.6vw, 6px)',
        }}
      >
        {/* Goal labels header */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1, justifyContent: 'flex-start' }}>
          <Box
            sx={{
              minWidth: 'var(--label-width)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: 'var(--cell-size)',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: '6px',
              backgroundColor: 'background.paper',
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'text.primary',
            }}
          >
            <Typography variant="caption" sx={{ fontWeight: 600 }}>
              Week
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 'var(--cell-gap)' }}>
            {goalLabels.map((goal) => (
              <Typography
                key={goal.goalId}
                variant="caption"
                sx={{
                  width: 'var(--cell-size)',
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
          <Box
            key={weekIndex}
            sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'flex-start' }}
          >
            <Box
              title={week.weekLabelFull}
              sx={{
                minWidth: 'var(--label-width)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: 'var(--cell-size)',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: '6px',
                backgroundColor: 'background.paper',
                fontSize: '0.75rem',
                color: 'text.primary',
              }}
            >
              <Typography variant="caption">{week.weekLabel}</Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 'var(--cell-gap)' }}>
              {goalLabels.map((goal) => {
                const completionData = week.goalData[goal.goalId];
                const goalCreatedAt = goal.createdAt ? new Date(goal.createdAt) : null;
                const weekEnd = new Date(week.weekEnd);
                const isInactive = goalCreatedAt && weekEnd <= goalCreatedAt;
                const color = isInactive ? '#e0e0e0' : getColor(completionData);
                const tooltipTitle = isInactive
                  ? `${goal.title} - ${week.weekLabelFull}: N/A (not active yet)`
                  : completionData
                    ? `${goal.title} - ${week.weekLabelFull}: ${completionData.completionPercentage.toFixed(1)}% ${completionData.completed ? '✓ Completed' : '✗ Missed'}`
                    : `${goal.title} - ${week.weekLabelFull}: No data`;

                return (
                  <MUITooltip key={goal.goalId} title={tooltipTitle} arrow>
                    <Box
                      sx={{
                        width: 'var(--cell-size)',
                        height: 'var(--cell-size)',
                        backgroundColor: color,
                        borderRadius: '4px',
                        cursor: isInactive ? 'default' : 'pointer',
                        border: '1px solid',
                        borderColor: 'divider',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        ...(isInactive ? {} : {
                          '&:hover': {
                            opacity: 0.8,
                            transform: 'scale(1.05)',
                          },
                        }),
                      }}
                    >
                      {isInactive ? (
                        <Typography
                          variant="caption"
                          sx={{
                            fontSize: '0.65rem',
                            color: 'text.secondary',
                            fontWeight: 600,
                          }}
                        >
                          N/A
                        </Typography>
                      ) : completionData ? (
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
                      ) : null}
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
          <Box sx={{ width: 20, height: 20, backgroundColor: '#e0e0e0', borderRadius: '4px', border: '1px solid #ddd' }} />
          <Typography variant="caption">N/A (not active yet)</Typography>
        </Box>
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

