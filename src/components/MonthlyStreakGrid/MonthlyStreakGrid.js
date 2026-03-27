import React, { useMemo } from 'react';
import { Box, ButtonBase, CircularProgress, IconButton, Paper, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import { ChevronLeft, ChevronRight, PauseRounded } from '@mui/icons-material';
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
  streakSummary = null,
  /** @type {Set<string>|null} local date keys (YYYY-MM-DD) fully covered by a goal pause */
  pausedDateKeys = null,
  /**
   * When true, today's cell is shown paused if the goal is still paused (fixes open-pause / end-of-day mismatch).
   * Must be false after resume so today clears immediately even late in the day; past days still use pausedDateKeys.
   */
  isGoalPaused = false,
}) => {
  const monthValue = monthDate ? new Date(monthDate) : new Date();
  const year = monthValue.getFullYear();
  const monthIndex = monthValue.getMonth();
  const firstDayOfMonth = new Date(year, monthIndex, 1).getDay();

  const calToday = new Date();
  const todayY = calToday.getFullYear();
  const todayM = calToday.getMonth();
  const todayD = calToday.getDate();

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
  const getProgressColor = (value) => {
    if (value >= 100) return 'success.main';
    if (value >= 75) return 'primary.main';
    if (value >= 50) return 'warning.main';
    if (value > 0) return 'info.main';
    return 'error.main';
  };

  return (
    <Paper sx={{ p: 2, mb: 2, width: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <IconButton size="small" onClick={onPrevMonth} aria-label="Previous month">
          <ChevronLeft fontSize="small" />
        </IconButton>
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
          <Typography variant="subtitle2">{monthLabel}</Typography>
          {showMonthlyPercent && (
            <Box sx={{ position: 'relative', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CircularProgress
                variant="determinate"
                value={Math.round(progressPercent)}
                size={28}
                thickness={3}
                sx={{ color: getProgressColor(progressPercent) }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  width: 20,
                  height: 20,
                  borderRadius: '999px',
                  border: '1px solid',
                  borderColor: getProgressColor(progressPercent),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.6rem',
                  color: getProgressColor(progressPercent),
                  backgroundColor: 'background.paper',
                }}
              >
                {Math.round(progressPercent)}%
              </Box>
            </Box>
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
                            sx={{
                              position: 'absolute',
                              inset: 0,
                              margin: 'auto',
                              color: getProgressColor(displayValue),
                            }}
                          />
                          <Box
                            sx={{
                              width: 22,
                              height: 22,
                              borderRadius: '999px',
                              border: '1px solid',
                              borderColor: getProgressColor(displayValue),
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              backgroundColor: 'background.paper',
                              color: getProgressColor(displayValue),
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
                const isTodayCell = (
                  cellDate.getFullYear() === todayY
                  && cellDate.getMonth() === todayM
                  && cellDate.getDate() === todayD
                );
                const isPausedDay = (
                  (pausedDateKeys instanceof Set && pausedDateKeys.has(dateKey))
                  || (isTodayCell && isGoalPaused)
                );
                const isFuture = cellDate > today;
                const isOutsideMonth = cellDate.getMonth() !== monthIndex;
                const plainFuture = isFuture && !isPausedDay;

                let backgroundColor = hasEntry
                  ? 'primary.main'
                  : plainFuture
                    ? 'action.disabledBackground'
                    : 'background.paper';
                if (isPausedDay && !hasEntry) {
                  backgroundColor = (theme) => alpha(
                      theme.palette.warning.main,
                      isFuture ? 0.1 : 0.2,
                  );
                }
                const borderColor = hasEntry
                  ? 'primary.main'
                  : isPausedDay
                    ? 'warning.main'
                    : plainFuture
                      ? 'transparent'
                      : 'divider';
                const baseTextColor = hasEntry
                  ? 'common.white'
                  : plainFuture
                    ? 'text.disabled'
                    : 'text.primary';
                const textColor = isOutsideMonth && !hasEntry ? 'text.disabled' : baseTextColor;
                const isClickable = typeof onDayClick === 'function' && !isPausedDay;

                const dayLabel = cellDate.toLocaleDateString(undefined, {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                });

                return (
                  <ButtonBase
                    key={dateKey}
                    onClick={isClickable ? () => onDayClick(cellDate) : undefined}
                    disabled={isPausedDay}
                    aria-label={
                      isPausedDay
                        ? `${dayLabel}, goal paused`
                        : undefined
                    }
                    sx={{
                      width: '100%',
                      minHeight: 28,
                      aspectRatio: '1 / 1',
                      borderRadius: '999px',
                      position: 'relative',
                      backgroundColor,
                      backgroundImage: isPausedDay && !hasEntry
                        ? 'repeating-linear-gradient(135deg, transparent, transparent 2px, rgba(0,0,0,0.05) 2px, rgba(0,0,0,0.05) 4px)'
                        : undefined,
                      border: plainFuture ? 'none' : '1px solid',
                      borderColor,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 0,
                      pt: isPausedDay ? 0.25 : 0,
                      pb: isPausedDay ? 0.125 : 0,
                      fontSize: '0.65rem',
                      color: textColor,
                      opacity: isOutsideMonth ? 0.6 : plainFuture ? 0.75 : 1,
                      cursor: isClickable ? 'pointer' : 'default',
                    }}
                  >
                    <Box component="span" sx={{ lineHeight: 1 }}>
                      {cellDate.getDate()}
                    </Box>
                    {isPausedDay && (
                      <PauseRounded
                        sx={{
                          fontSize: '11px',
                          color: hasEntry ? 'common.white' : 'warning.dark',
                          opacity: hasEntry ? 0.95 : 1,
                          mt: -0.125,
                        }}
                        aria-hidden
                      />
                    )}
                  </ButtonBase>
                );
              })
            ))}
          </Box>
        </Box>
      </Box>

      {streakSummary && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1.5 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              {streakSummary.currentLabel}
            </Typography>
            <Typography variant="body2">{streakSummary.currentValue}</Typography>
          </Box>
          <Box sx={{ textAlign: 'right' }}>
            <Typography variant="caption" color="text.secondary">
              {streakSummary.longestLabel}
            </Typography>
            <Typography variant="body2">{streakSummary.longestValue}</Typography>
          </Box>
        </Box>
      )}
    </Paper>
  );
};

export default MonthlyStreakGrid;
