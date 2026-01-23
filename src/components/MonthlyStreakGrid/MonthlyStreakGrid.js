import React, { useMemo } from 'react';
import { Box, ButtonBase, CircularProgress, IconButton, Paper, Typography } from '@mui/material';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';
import { formatLocalDate } from 'utils/dateHelpers';

const MonthlyStreakGrid = ({
  entries = [],
  monthDate,
  onPrevMonth = () => {},
  onNextMonth = () => {},
  onDayClick = null,
  cadence = null,
  progressPercent = null,
  weeklyProgressByRow = null,
}) => {
  const monthValue = monthDate ? new Date(monthDate) : new Date();
  const year = monthValue.getFullYear();
  const monthIndex = monthValue.getMonth();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, monthIndex, 1).getDay();

  const entryDates = useMemo(() => {
    const dateSet = new Set();
    entries.forEach((entry) => {
      const dateValue = new Date(entry.occurred_at || entry.occurredAt);
      if (!Number.isNaN(dateValue.getTime())) {
        dateSet.add(formatLocalDate(dateValue));
      }
    });
    return dateSet;
  }, [entries]);

  const today = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now;
  }, []);

  const monthLabel = monthValue.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const gridDates = useMemo(() => {
    const startDate = new Date(year, monthIndex, 1 - firstDayOfMonth);
    return Array.from({ length: 35 }, (_, index) => {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + index);
      return date;
    });
  }, [year, monthIndex, firstDayOfMonth]);

  const showWeeklyProgress = cadence === 'week' && Array.isArray(weeklyProgressByRow);
  const showMonthlyPercent = cadence === 'month' && typeof progressPercent === 'number';

  return (
    <Paper sx={{ p: 2, mb: 2, width: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <IconButton size="small" onClick={onPrevMonth} aria-label="Previous month">
          <ChevronLeft fontSize="small" />
        </IconButton>
        <Box sx={{ flex: 1, textAlign: 'center' }}>
          <Typography variant="subtitle2">{monthLabel}</Typography>
          {showMonthlyPercent && (
            <Typography variant="caption" color="text.secondary">
              {Math.round(progressPercent)}%
            </Typography>
          )}
        </Box>
        <IconButton size="small" onClick={onNextMonth} aria-label="Next month">
          <ChevronRight fontSize="small" />
        </IconButton>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
        <Box sx={{ flex: 1 }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: showWeeklyProgress ? 'repeat(7, minmax(0, 1fr)) minmax(0, 32px)' : 'repeat(7, minmax(0, 1fr))',
              gap: 0.35,
              mb: 0.75,
            }}
          >
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((label, index) => (
              <Typography
                key={`${label}-${index}`}
                variant="caption"
                color="text.secondary"
                sx={{ textAlign: 'center' }}
              >
                {label}
              </Typography>
            ))}
            {showWeeklyProgress && <Box />}
          </Box>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: showWeeklyProgress ? 'repeat(7, minmax(0, 1fr)) minmax(0, 32px)' : 'repeat(7, minmax(0, 1fr))',
              gap: 0.35,
              width: '100%',
            }}
          >
            {Array.from({ length: 5 }).map((_, rowIndex) => (
              Array.from({ length: showWeeklyProgress ? 8 : 7 }).map((__, colIndex) => {
                if (showWeeklyProgress && colIndex === 7) {
                  const percentValue = weeklyProgressByRow?.[rowIndex];
                  const displayValue = typeof percentValue === 'number' ? percentValue : null;

                  return (
                    <Box
                      key={`week-progress-${rowIndex}`}
                      sx={{
                        width: '100%',
                        minHeight: 28,
                        aspectRatio: '1 / 1',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'text.secondary',
                        fontSize: '0.65rem',
                      }}
                    >
                      {displayValue !== null && (
                        <>
                          <CircularProgress
                            variant="determinate"
                            value={displayValue}
                            size={28}
                            thickness={3}
                            sx={{ position: 'absolute', inset: 0, margin: 'auto' }}
                          />
                          <Box
                            sx={{
                              width: 22,
                              height: 22,
                              borderRadius: '999px',
                              border: '1px solid',
                              borderColor: 'divider',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: 'background.paper',
                            }}
                          >
                            {Math.round(displayValue)}%
                          </Box>
                        </>
                      )}
                    </Box>
                  );
                }

                const dayIndex = rowIndex * 7 + colIndex;
                const cellDate = gridDates[dayIndex];
                if (!cellDate) {
                  return <Box key={`empty-${rowIndex}-${colIndex}`} sx={{ width: '100%', minHeight: 32 }} />;
                }

                const dateKey = formatLocalDate(cellDate);
                const hasEntry = entryDates.has(dateKey);
                const isFuture = cellDate > today;
                const isOutsideMonth = cellDate.getMonth() !== monthIndex;
                const backgroundColor = hasEntry
                  ? 'primary.main'
                  : isFuture
                    ? 'action.disabledBackground'
                    : 'background.paper';
                const borderColor = hasEntry ? 'primary.main' : isFuture ? 'action.disabledBackground' : 'divider';
                const baseTextColor = hasEntry ? 'common.white' : isFuture ? 'text.disabled' : 'text.primary';
                const textColor = isOutsideMonth && !hasEntry ? 'text.disabled' : baseTextColor;
                const isClickable = typeof onDayClick === 'function';

                return (
                  <ButtonBase
                    key={dateKey}
                    onClick={isClickable ? () => onDayClick(cellDate) : undefined}
                    sx={{
                      width: '100%',
                      minHeight: 28,
                      aspectRatio: '1 / 1',
                      borderRadius: '999px',
                      backgroundColor,
                      border: '1px solid',
                      borderColor,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.65rem',
                      color: textColor,
                      opacity: isOutsideMonth ? 0.6 : 1,
                      cursor: isClickable ? 'pointer' : 'default',
                    }}
                  >
                    {cellDate.getDate()}
                  </ButtonBase>
                );
              })
            ))}
          </Box>
        </Box>
      </Box>
    </Paper>
  );
};

export default MonthlyStreakGrid;
