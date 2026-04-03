import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
// UI
import { Close } from '@mui/icons-material';
import {
  Box,
  Button,
  CircularProgress,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItemButton,
  Slide,
  Stack,
  Typography,
} from '@mui/material';
// UI
import FullscreenDialog from 'UI/FullscreenDialog';
// Context
import useClubContext from 'contexts/Club';
// Components
import GoalTypeChip from 'components/GoalTypeChip';
import MonthlyStreakGrid from 'components/MonthlyStreakGrid';
import PausedGoalChip from 'components/PausedGoalChip';
import ProfileAvatar from 'components/ProfileAvatar';
// Services
import { getGoalEntries, getGoals } from 'services/goals/goals.service';
// Utils
import { formatLocalDate } from 'utils/dateHelpers';
import {
  formatDate,
  getGoalStreakSummary,
  getGoalTargetValue,
  getPeriodBoundaries,
  getTodayEntries,
  isGoalPauseCoveringPeriod,
} from 'utils/goalHelpers';
import { aprilFoolsGoalTitle } from 'utils/aprilFools2026';
const getUserId = (user) => user?.uid || user?.id || user?.userId || user?.user_id;

const UsersGoalsModal = ({ open, onClose, user }) => {
  const { currentClub } = useClubContext();
  const [loading, setLoading] = useState(false);
  const [goalsToday, setGoalsToday] = useState([]);
  const [goalsNoEntry, setGoalsNoEntry] = useState([]);
  const [goalsCompleted, setGoalsCompleted] = useState([]);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [monthCursor, setMonthCursor] = useState(new Date());
  const [monthEntries, setMonthEntries] = useState([]);
  const [allEntries, setAllEntries] = useState([]);
  const [monthLoading, setMonthLoading] = useState(false);
  const [error, setError] = useState(null);
  const [containerHeight, setContainerHeight] = useState(null);

  const listRef = useRef(null);
  const detailRef = useRef(null);

  const targetUserId = getUserId(user);
  const displayName = user?.displayName || user?.name || user?.email || 'User';

  const clearSelection = useCallback(() => {
    setSelectedGoal(null);
    setMonthEntries([]);
    setMonthCursor(new Date());
    setAllEntries([]);
  }, []);

  useEffect(() => {
    if (!open) return;
    clearSelection();
  }, [open, clearSelection]);

  const formatGoalSummary = useCallback((goal, entriesToday) => {
    if (goal.type === 'metric') {
      const total = entriesToday.reduce((sum, entry) => sum + (parseFloat(entry.quantity) || 0), 0);
      const unit = goal.unit ? ` ${goal.unit}` : '';
      return `${total.toFixed(1)}${unit}`;
    }

    return `${entriesToday.length} ${entriesToday.length === 1 ? 'entry' : 'entries'}`;
  }, []);

  const fetchGoalsToday = useCallback(async () => {
    if (!targetUserId || !currentClub?.id) return;

    try {
      setLoading(true);
      setError(null);
      const goals = await getGoals(targetUserId, currentClub.id);
      const enrichedGoals = (goals || []).map((goal) => {
        const entriesToday = getTodayEntries(goal.entries || []);
        return {
          ...goal,
          entriesToday,
          summaryLabel: formatGoalSummary(goal, entriesToday),
        };
      });

      const goalsWithTodayEntries = enrichedGoals.filter(goal => goal.entriesToday.length > 0);
      const goalsCompletedList = enrichedGoals.filter(goal => goal.completed);
      const goalsWithoutEntries = enrichedGoals.filter(goal => (
        goal.entriesToday.length === 0 && !goal.completed
      ));

      setGoalsToday(goalsWithTodayEntries);
      setGoalsNoEntry(goalsWithoutEntries);
      setGoalsCompleted(goalsCompletedList);
    } catch (err) {
      console.error('Error loading user goals for today:', err);
      setError('Failed to load today’s goal entries.');
    } finally {
      setLoading(false);
    }
  }, [currentClub?.id, targetUserId, formatGoalSummary]);

  useEffect(() => {
    if (!open) return;
    fetchGoalsToday();
  }, [open, fetchGoalsToday]);

  const loadMonthEntries = useCallback(async (goal, dateCursor) => {
    if (!goal || !targetUserId) return;

    try {
      setMonthLoading(true);
      const monthDate = dateCursor || new Date();
      const startDate = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const endDate = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);
      const [entries, allGoalEntries] = await Promise.all([
        getGoalEntries(targetUserId, goal.id, startDate, endDate),
        getGoalEntries(targetUserId, goal.id),
      ]);
      setMonthEntries(entries || []);
      setAllEntries(allGoalEntries || []);
    } catch (err) {
      console.error('Error loading goal entries for month:', err);
      setError('Failed to load monthly entries.');
    } finally {
      setMonthLoading(false);
    }
  }, [targetUserId]);

  useEffect(() => {
    if (!selectedGoal || !open) return;
    loadMonthEntries(selectedGoal, monthCursor);
  }, [selectedGoal, monthCursor, open, loadMonthEntries]);

  const monthLabel = useMemo(() => {
    const date = monthCursor || new Date();
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }, [monthCursor]);

  const targetValue = useMemo(() => (
    getGoalTargetValue(selectedGoal)
  ), [selectedGoal]);

  const getPercentForEntries = useCallback((entriesForPeriod) => {
    if (!selectedGoal || !entriesForPeriod) return null;
    if (selectedGoal.cadence !== 'week' && selectedGoal.cadence !== 'month') return null;

    const actual = selectedGoal.measure === 'sum'
      ? entriesForPeriod.reduce((acc, entry) => acc + (parseFloat(entry.quantity) || 0), 0)
      : entriesForPeriod.length;
    if (!targetValue) return 0;
    return Math.round(Math.min((actual / targetValue) * 100, 100));
  }, [selectedGoal, targetValue]);

  const weeklyProgressByRow = useMemo(() => {
    if (selectedGoal?.cadence !== 'week') return null;
    const year = monthCursor.getFullYear();
    const month = monthCursor.getMonth();
    const firstDayOfMonth = new Date(year, month, 1).getDay();

    return Array.from({ length: 5 }, (_, rowIndex) => {
      const anchorDate = new Date(year, month, 1 - firstDayOfMonth + (rowIndex * 7));
      const { start, end } = getPeriodBoundaries('week', anchorDate);
      const entriesForWeek = (monthEntries || []).filter(entry => {
        const entryDate = new Date(entry.occurred_at || entry.occurredAt || 0);
        return entryDate >= start && entryDate < end;
      });

      return getPercentForEntries(entriesForWeek);
    });
  }, [selectedGoal?.cadence, monthCursor, monthEntries, getPercentForEntries]);

  const monthProgressPercent = useMemo(() => (
    selectedGoal?.cadence === 'month' ? getPercentForEntries(monthEntries) : null
  ), [selectedGoal?.cadence, getPercentForEntries, monthEntries]);

  const streakSummary = useMemo(() => (
    selectedGoal ? getGoalStreakSummary(selectedGoal, allEntries) : null
  ), [selectedGoal, allEntries]);

  const pausedDateKeys = useMemo(() => {
    const set = new Set();
    const pauses = selectedGoal?.goalPauses;
    if (!pauses?.length || !monthCursor) return set;
    const normalized = pauses.map((p) => ({
      pausedAt: p.pausedAt || p.paused_at,
      resumedAt: p.resumedAt ?? p.resumed_at ?? null,
    }));
    const y = monthCursor.getFullYear();
    const m = monthCursor.getMonth();
    const dim = new Date(y, m + 1, 0).getDate();
    const now = new Date();
    for (let d = 1; d <= dim; d += 1) {
      const dayStart = new Date(y, m, d, 0, 0, 0, 0);
      const dayEnd = new Date(y, m, d + 1, 0, 0, 0, 0);
      if (isGoalPauseCoveringPeriod(dayStart, dayEnd, normalized, now)) {
        set.add(formatLocalDate(dayStart));
      }
    }
    return set;
  }, [selectedGoal?.goalPauses, monthCursor]);

  const showDetail = Boolean(selectedGoal);

  useLayoutEffect(() => {
    const activeRef = showDetail ? detailRef : listRef;
    if (!activeRef.current) return;
    const nextHeight = activeRef.current.offsetHeight;
    if (nextHeight) {
      setContainerHeight(nextHeight);
    }
  }, [
    showDetail,
    goalsToday,
    goalsNoEntry,
    selectedGoal,
    monthEntries,
    monthLoading,
    loading,
    error,
  ]);

  return (
    <FullscreenDialog
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          backgroundColor: 'background.default',
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 2, gap: 2 }}>
        <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0 }}>
          <ProfileAvatar
            user={user}
            size={40}
            disableGoalModal
            showEntryRing={false}
          />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h5" component="div" noWrap>
              {displayName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Goal activity
            </Typography>
          </Box>
        </Stack>
        <IconButton onClick={onClose} size="small" aria-label="Close">
          <Close />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 0 }}>
        <Box sx={{ maxWidth: 1200, mx: 'auto', width: '100%', pt: 2 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={24} />
          </Box>
        ) : error ? (
          <Typography variant="body2" color="error" textAlign="center">
            {error}
          </Typography>
        ) : (
          <Box
            sx={{
              position: 'relative',
              minHeight: containerHeight ? `${containerHeight}px` : 240,
              height: containerHeight ? `${containerHeight}px` : 'auto',
              overflow: 'hidden',
            }}
          >
            <Slide
              direction="right"
              in={!showDetail}
              mountOnEnter
              unmountOnExit
              timeout={250}
            >
              <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100%' }} ref={listRef}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
                  Today’s Goal Entries
                </Typography>
                {goalsToday.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 2 }}>
                    No goal entries yet today.
                  </Typography>
                ) : (
                  <List disablePadding sx={{ mb: 2 }}>
                    {goalsToday.map((goal, index) => (
                      <React.Fragment key={goal.id}>
                        <ListItemButton onClick={() => setSelectedGoal(goal)} sx={{ px: 1 }}>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body1" sx={{ fontWeight: 600 }} noWrap>
                              {aprilFoolsGoalTitle(goal.title || 'Goal', goal.id)}
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                              <GoalTypeChip goal={goal} />
                              {goal.isPaused && <PausedGoalChip />}
                            </Box>
                          </Box>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {goal.summaryLabel}
                          </Typography>
                        </ListItemButton>
                        {index < goalsToday.length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                )}

                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
                  Goals Without Entries Today
                </Typography>
                {goalsNoEntry.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 2 }}>
                    No other goals in progress.
                  </Typography>
                ) : (
                  <List disablePadding>
                    {goalsNoEntry.map((goal, index) => (
                      <React.Fragment key={goal.id}>
                        <ListItemButton
                          onClick={() => setSelectedGoal(goal)}
                          sx={{ px: 1, opacity: 0.7 }}
                        >
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body1" sx={{ fontWeight: 600 }} noWrap>
                              {aprilFoolsGoalTitle(goal.title || 'Goal', goal.id)}
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                              <GoalTypeChip goal={goal} />
                              {goal.isPaused && <PausedGoalChip />}
                            </Box>
                          </Box>
                          <Typography variant="caption" color="text.secondary">
                            —
                          </Typography>
                        </ListItemButton>
                        {index < goalsNoEntry.length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                )}

            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700, mt: 3 }}>
              Completed Goals
            </Typography>
            {goalsCompleted.length === 0 ? (
              <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 2 }}>
                No completed goals yet.
              </Typography>
            ) : (
              <List disablePadding>
                {goalsCompleted.map((goal, index) => (
                  <React.Fragment key={goal.id}>
                    <ListItemButton
                      onClick={() => setSelectedGoal(goal)}
                      sx={{ px: 1, opacity: 0.7 }}
                    >
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="body1" sx={{ fontWeight: 600 }} noWrap>
                          {aprilFoolsGoalTitle(goal.title || 'Goal', goal.id)}
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                          <GoalTypeChip goal={goal} />
                          {goal.isPaused && <PausedGoalChip />}
                        </Box>
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(goal.completedAt || goal.completed_at)}
                      </Typography>
                    </ListItemButton>
                    {index < goalsCompleted.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            )}
              </Box>
            </Slide>

            <Slide
              direction="left"
              in={showDetail}
              mountOnEnter
              unmountOnExit
              timeout={250}
            >
              <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100%' }} ref={detailRef}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2, gap: 2 }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {selectedGoal?.title || 'Goal'}
                    </Typography>
                    {selectedGoal?.type !== 'one_time' && (
                      <Typography variant="caption" color="text.secondary">
                        {monthLabel}
                      </Typography>
                    )}
                  </Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, justifyContent: 'flex-end' }}>
                    <GoalTypeChip goal={selectedGoal} />
                    {selectedGoal?.isPaused && <PausedGoalChip />}
                  </Box>
                </Stack>

                {selectedGoal?.type === 'one_time' ? (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
                      Due date
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {formatDate(selectedGoal?.dueAt || selectedGoal?.due_at)}
                    </Typography>
                  </Box>
                ) : selectedGoal?.type === 'milestone' ? (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
                      Milestones
                    </Typography>
                    {Array.isArray(selectedGoal?.milestones) && selectedGoal.milestones.length > 0 ? (
                      <List disablePadding>
                        {[...selectedGoal.milestones]
                          .sort((a, b) => {
                            const orderA = a.order ?? a.id ?? a.ID ?? 0;
                            const orderB = b.order ?? b.id ?? b.ID ?? 0;
                            return orderA - orderB;
                          })
                          .map((milestone, index, sortedMilestones) => (
                          <React.Fragment key={milestone.id || milestone.title || index}>
                            <Box sx={{ px: 1, py: 1 }}>
                              <Typography
                                variant="body2"
                                sx={{
                                  textDecoration: milestone.done ? 'line-through' : 'none',
                                  opacity: milestone.done ? 0.6 : 1,
                                }}
                              >
                                {milestone.title || 'Untitled milestone'}
                              </Typography>
                            </Box>
                            {index < sortedMilestones.length - 1 && <Divider />}
                          </React.Fragment>
                          ))}
                      </List>
                    ) : (
                      <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 2 }}>
                        No milestones available.
                      </Typography>
                    )}
                  </Box>
                ) : monthLoading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                    <CircularProgress size={24} />
                  </Box>
                ) : (
                  <MonthlyStreakGrid
                    entries={monthEntries}
                    monthDate={monthCursor}
                    onPrevMonth={() => {
                      setMonthCursor(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
                    }}
                    onNextMonth={() => {
                      setMonthCursor(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
                    }}
                    cadence={selectedGoal?.cadence}
                    progressPercent={monthProgressPercent}
                    weeklyProgressByRow={weeklyProgressByRow}
                    streakSummary={streakSummary}
                    pausedDateKeys={pausedDateKeys}
                    isGoalPaused={Boolean(selectedGoal?.isPaused)}
                  />
                )}
              </Box>
            </Slide>
          </Box>
        )}
        </Box>
      </DialogContent>
      <DialogActions
        sx={{
          justifyContent: 'space-between',
          px: 3,
          pb: 3,
          flexWrap: 'wrap',
          gap: 1,
          '& > .MuiButton-root': { m: 0 },
        }}
      >
        {selectedGoal && (
          <Button variant="text" onClick={clearSelection}>
            Back to goals
          </Button>
        )}
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </FullscreenDialog>
  );
};

export default UsersGoalsModal;
