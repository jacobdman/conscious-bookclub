import React, { useCallback, useEffect, useMemo, useState } from 'react';
// UI
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  List,
  ListItemButton,
  Stack,
  Typography,
} from '@mui/material';
// Context
import useClubContext from 'contexts/Club';
// Components
import GoalTypeChip from 'components/GoalTypeChip';
import MonthlyStreakGrid from 'components/MonthlyStreakGrid';
import ProfileAvatar from 'components/ProfileAvatar';
// Services
import { getGoalEntries, getGoals } from 'services/goals/goals.service';
// Utils
import {
  formatDate,
  getGoalStreakSummary,
  getGoalTargetValue,
  getPeriodBoundaries,
  getTodayEntries,
} from 'utils/goalHelpers';

const getUserId = (user) => user?.uid || user?.id || user?.userId || user?.user_id;

const UsersGoalsModal = ({ open, onClose, user }) => {
  const { currentClub } = useClubContext();
  const [loading, setLoading] = useState(false);
  const [goalsToday, setGoalsToday] = useState([]);
  const [goalsNoEntry, setGoalsNoEntry] = useState([]);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [monthCursor, setMonthCursor] = useState(new Date());
  const [monthEntries, setMonthEntries] = useState([]);
  const [allEntries, setAllEntries] = useState([]);
  const [monthLoading, setMonthLoading] = useState(false);
  const [error, setError] = useState(null);

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
      const goalsWithoutEntries = enrichedGoals.filter(goal => goal.entriesToday.length === 0);

      setGoalsToday(goalsWithTodayEntries);
      setGoalsNoEntry(goalsWithoutEntries);
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

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <ProfileAvatar
            user={user}
            size={40}
            disableGoalModal
            showEntryRing={false}
          />
          <Box>
            <Typography variant="h6">{displayName}</Typography>
            <Typography variant="caption" color="text.secondary">
              Goal activity
            </Typography>
          </Box>
        </Stack>
      </DialogTitle>
      <DialogContent dividers sx={{ pt: 2 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
            <CircularProgress size={24} />
          </Box>
        ) : error ? (
          <Typography variant="body2" color="error" textAlign="center">
            {error}
          </Typography>
        ) : selectedGoal ? (
          <Box>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2, gap: 2 }}>
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  {selectedGoal.title || 'Goal'}
                </Typography>
                {selectedGoal.type !== 'one_time' && (
                  <Typography variant="caption" color="text.secondary">
                    {monthLabel}
                  </Typography>
                )}
              </Box>
              <GoalTypeChip goal={selectedGoal} />
            </Stack>

            {selectedGoal.type === 'one_time' ? (
              <Box sx={{ mt: 1 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
                  Due date
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatDate(selectedGoal.dueAt || selectedGoal.due_at)}
                </Typography>
              </Box>
            ) : selectedGoal.type === 'milestone' ? (
              <Box sx={{ mt: 1 }}>
                <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>
                  Milestones
                </Typography>
                {Array.isArray(selectedGoal.milestones) && selectedGoal.milestones.length > 0 ? (
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
              />
            )}
          </Box>
        ) : (
          <Box>
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
                          {goal.title || 'Goal'}
                        </Typography>
                        <GoalTypeChip goal={goal} sx={{ mt: 0.5 }} />
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
                          {goal.title || 'Goal'}
                        </Typography>
                        <GoalTypeChip goal={goal} sx={{ mt: 0.5 }} />
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
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ justifyContent: 'space-between' }}>
        {selectedGoal && (
          <Button variant="text" onClick={clearSelection}>
            Back to goals
          </Button>
        )}
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default UsersGoalsModal;
