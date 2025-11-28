import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';

const WeeklyGoalsBreakdown = ({ weeklyBreakdown, loading }) => {
  if (loading) {
    return (
      <Typography variant="body2" color="text.secondary" textAlign="center">
        Loading breakdown...
      </Typography>
    );
  }

  if (!weeklyBreakdown || weeklyBreakdown.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" textAlign="center">
        No weekly breakdown data available
      </Typography>
    );
  }

  // Reverse so most recent week is first
  const reversedBreakdown = [...weeklyBreakdown].reverse();

  const formatDateRange = (weekStart, weekEnd) => {
    const start = new Date(weekStart);
    const end = new Date(weekEnd);
    const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `${startStr} - ${endStr}`;
  };

  const formatEntryDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <Box>
      {reversedBreakdown.map((week, weekIndex) => (
        <Accordion key={weekIndex} defaultExpanded={weekIndex === 0}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
              <Typography variant="h6" sx={{ flexGrow: 1 }}>
                Week: {formatDateRange(week.weekStart, week.weekEnd)}
              </Typography>
              <Chip
                label={`${week.overallCompletionRate}%`}
                color={week.overallCompletionRate >= 100 ? 'success' : week.overallCompletionRate >= 50 ? 'warning' : 'error'}
                size="small"
              />
              <Typography variant="body2" color="text.secondary">
                {week.completed} / {week.total} goals completed
              </Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Goal</TableCell>
                    <TableCell align="center">Status</TableCell>
                    <TableCell align="center">Progress</TableCell>
                    <TableCell align="center">Completion</TableCell>
                    <TableCell>Entries</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {week.goals.map((goal) => {
                    const isCountBased = goal.measure === 'count';
                    const progressText = isCountBased
                      ? `${goal.actualCount} / ${goal.targetCount}`
                      : `${goal.actualQuantity.toFixed(1)} / ${goal.targetQuantity.toFixed(1)} ${goal.unit || ''}`;

                    return (
                      <TableRow
                        key={goal.goalId}
                        sx={{
                          backgroundColor: goal.completed ? 'action.hover' : 'error.light',
                          opacity: goal.completed ? 1 : 0.7,
                        }}
                      >
                        <TableCell>
                          <Typography variant="body2" fontWeight={500}>
                            {goal.title}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          {goal.completed ? (
                            <CheckCircleIcon color="success" fontSize="small" />
                          ) : (
                            <CancelIcon color="error" fontSize="small" />
                          )}
                        </TableCell>
                        <TableCell align="center">
                          <Typography variant="body2">{progressText}</Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={`${goal.completionPercentage.toFixed(1)}%`}
                            color={goal.completed ? 'success' : 'error'}
                            size="small"
                            variant={goal.completed ? 'filled' : 'outlined'}
                          />
                        </TableCell>
                        <TableCell>
                          {goal.entries.length > 0 ? (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                              {goal.entries.map((entry, idx) => (
                                <Chip
                                  key={idx}
                                  label={formatEntryDate(entry.date)}
                                  size="small"
                                  variant="outlined"
                                  sx={{ fontSize: '0.7rem' }}
                                />
                              ))}
                            </Box>
                          ) : (
                            <Typography variant="body2" color="text.secondary" fontSize="0.75rem">
                              No entries
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </AccordionDetails>
        </Accordion>
      ))}
    </Box>
  );
};

export default WeeklyGoalsBreakdown;

