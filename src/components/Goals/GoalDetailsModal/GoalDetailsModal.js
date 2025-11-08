import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
  Box,
  Button,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Divider,
  Checkbox,
} from '@mui/material';
import { Close, Add, Edit, Delete } from '@mui/icons-material';
import { useAuth } from 'AuthContext';
import { 
  getGoalEntries,
  createGoalEntry,
  updateGoalEntry,
  deleteGoalEntry,
  updateMilestone,
  updateGoal,
} from 'services/goals/goals.service';
import useClubContext from 'contexts/Club';
import GoalEntryDialog from 'components/Goals/GoalEntryDialog';
import { 
  getPeriodBoundaries, 
  getProgressText, 
  getProgressBarValue,
  formatDate,
} from 'utils/goalHelpers';

const GoalDetailsModal = ({ open, onClose, goal }) => {
  const { user } = useAuth();
  const { currentClub } = useClubContext();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [entryDialog, setEntryDialog] = useState({ open: false, entry: null, saving: false, error: null });
  const observerTarget = useRef(null);
  const currentOffset = useRef(0);
  const INITIAL_LIMIT = 10;
  const LOAD_MORE_LIMIT = 10;

  const fetchEntries = useCallback(async (offset = 0, limit = INITIAL_LIMIT, append = false) => {
    if (!user || !goal || (goal.type !== 'habit' && goal.type !== 'metric') || !goal.cadence) {
      return;
    }

    try {
      if (offset === 0) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      // For habit/metric goals, fetch all entries (no period filter for full history)
      const fetchedEntries = await getGoalEntries(user.uid, goal.id, null, null, limit, offset);

      if (append) {
        setEntries(prev => [...prev, ...fetchedEntries]);
      } else {
        setEntries(fetchedEntries);
      }

      // Check if there are more entries to load
      setHasMore(fetchedEntries.length === limit);
      currentOffset.current = offset + fetchedEntries.length;
    } catch (err) {
      console.error('Failed to fetch entries:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [user, goal]);

  // Load more entries when scrolling to bottom
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
          fetchEntries(currentOffset.current, LOAD_MORE_LIMIT, true);
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasMore, loadingMore, loading, fetchEntries]);

  // Fetch entries when modal opens or goal changes
  useEffect(() => {
    if (open && goal) {
      currentOffset.current = 0;
      fetchEntries(0, INITIAL_LIMIT, false);
    } else {
      setEntries([]);
      setHasMore(true);
    }
  }, [open, goal, fetchEntries]);

  const handleAddEntry = () => {
    setEntryDialog({ open: true, entry: null, saving: false, error: null });
  };

  const handleEditEntry = (entry) => {
    setEntryDialog({ open: true, entry, saving: false, error: null });
  };

  const handleDeleteEntry = async (entry) => {
    if (!user || !window.confirm('Are you sure you want to delete this entry?')) return;

    try {
      await deleteGoalEntry(user.uid, goal.id, entry.id);
      // Remove from local state
      setEntries(prev => prev.filter(e => e.id !== entry.id));
    } catch (err) {
      console.error('Failed to delete entry:', err);
    }
  };

  const handleSaveEntry = async (entryData) => {
    if (!user || !goal) return;

    const isUpdate = !!entryDialog.entry;

    setEntryDialog(prev => ({ ...prev, saving: true, error: null }));

    try {
      let savedEntry;
      if (isUpdate) {
        savedEntry = await updateGoalEntry(user.uid, goal.id, entryDialog.entry.id, entryData);
        setEntries(prev => prev.map(e => 
          e.id === entryDialog.entry.id ? { ...e, ...entryData, ...savedEntry } : e
        ));
      } else {
        savedEntry = await createGoalEntry(user.uid, goal.id, entryData);
        // Add to beginning of list (most recent first)
        setEntries(prev => [savedEntry, ...prev]);
      }
      
      setEntryDialog({ open: false, entry: null, saving: false, error: null });
    } catch (err) {
      setEntryDialog(prev => ({ 
        ...prev, 
        saving: false, 
        error: err.message || 'Failed to save entry'
      }));
    }
  };

  const handleToggleMilestone = async (milestone) => {
    if (!user || !goal) return;

    try {
      await updateMilestone(user.uid, goal.id, milestone.id, { done: !milestone.done });
      // Refresh entries to update any related data
      if (goal.type === 'habit' || goal.type === 'metric') {
        fetchEntries(0, currentOffset.current || INITIAL_LIMIT, false);
      }
    } catch (err) {
      console.error('Failed to update milestone:', err);
    }
  };

  const handleToggleOneTimeGoal = async () => {
    if (!user || !goal || goal.type !== 'one_time' || !currentClub) return;

    const newCompleted = !goal.completed;

    try {
      await updateGoal(user.uid, currentClub.id, goal.id, {
        completed: newCompleted,
        completedAt: newCompleted ? new Date().toISOString() : null,
      });
      // The goal will be updated in the context automatically
    } catch (err) {
      console.error('Failed to update goal:', err);
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'No date';
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch (error) {
      return 'Invalid date';
    }
  };

  if (!goal) return null;

  const progress = goal.progress;
  const hasProgress = progress && (goal.type === 'habit' || goal.type === 'metric');

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        fullScreen
        PaperProps={{
          sx: {
            backgroundColor: 'background.default',
          },
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 2 }}>
          <Typography variant="h5">{goal.title}</Typography>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          <Box sx={{ maxWidth: 1200, mx: 'auto', width: '100%' }}>
            {/* Goal Info */}
            <Paper sx={{ p: 3, mb: 3 }}>
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
                <Chip
                  label={goal.type === 'habit' ? 'Habit' : goal.type === 'metric' ? 'Metric' : goal.type === 'milestone' ? 'Milestone' : 'One-Time'}
                  color="primary"
                  size="small"
                />
                {goal.cadence && (
                  <Typography variant="body2" color="text.secondary">
                    {goal.cadence.charAt(0).toUpperCase() + goal.cadence.slice(1)}
                  </Typography>
                )}
              </Box>

              {/* Progress for habit/metric goals */}
              {hasProgress && (
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                    <Typography variant="body1" sx={{ minWidth: 200 }}>
                      {getProgressText(goal, progress)}
                    </Typography>
                    <Chip
                      label={progress.completed ? 'Completed' : 'In Progress'}
                      color={progress.completed ? 'success' : 'default'}
                      size="small"
                    />
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={getProgressBarValue(goal)}
                    sx={{ height: 8, borderRadius: 1 }}
                  />
                </Box>
              )}

              {/* Milestones for milestone goals */}
              {goal.type === 'milestone' && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Milestones
                  </Typography>
                  {(!goal.milestones || goal.milestones.length === 0) ? (
                    <Typography variant="body2" color="text.secondary">
                      No milestones defined
                    </Typography>
                  ) : (
                    goal.milestones.map((milestone) => {
                      if (!milestone || !milestone.id) return null;
                      
                      return (
                        <Box key={milestone.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Checkbox
                            checked={milestone.done || false}
                            onChange={() => handleToggleMilestone(milestone)}
                            disabled={!milestone.id}
                            size="small"
                          />
                          <Typography
                            variant="body2"
                            sx={{
                              textDecoration: milestone.done ? 'line-through' : 'none',
                              opacity: milestone.done ? 0.6 : 1,
                              flex: 1,
                            }}
                          >
                            {milestone.title || 'Untitled milestone'}
                          </Typography>
                          {milestone.doneAt && (
                            <Typography variant="caption" color="text.secondary">
                              {formatDate(milestone.doneAt)}
                            </Typography>
                          )}
                        </Box>
                      );
                    })
                  )}
                </Box>
              )}

              {/* One-time goal completion */}
              {goal.type === 'one_time' && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Checkbox
                    checked={goal.completed || false}
                    onChange={handleToggleOneTimeGoal}
                    size="small"
                  />
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ textDecoration: goal.completed ? 'line-through' : 'none', opacity: goal.completed ? 0.6 : 1 }}>
                      {goal.completed ? 'Completed' : 'Not completed'}
                    </Typography>
                    {goal.completedAt && (
                      <Typography variant="caption" color="text.secondary">
                        Completed: {formatDate(goal.completedAt)}
                      </Typography>
                    )}
                  </Box>
                </Box>
              )}
            </Paper>

            {/* Entries Section (for habit/metric goals) */}
            {(goal.type === 'habit' || goal.type === 'metric') && (
              <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Entry History</Typography>
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={handleAddEntry}
                  >
                    Add Entry
                  </Button>
                </Box>

                {loading && entries.length === 0 ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : entries.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ py: 4 }}>
                    No entries yet
                  </Typography>
                ) : (
                  <>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Date & Time</TableCell>
                          {goal.type === 'metric' && <TableCell>Quantity</TableCell>}
                          <TableCell align="right">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {entries.map((entry) => (
                          <TableRow key={entry.id}>
                            <TableCell>{formatDateTime(entry.occurred_at || entry.occurredAt)}</TableCell>
                            {goal.type === 'metric' && (
                              <TableCell>
                                <Chip
                                  label={`${parseFloat(entry.quantity || 0).toFixed(1)} ${goal.unit || ''}`}
                                  size="small"
                                  variant="outlined"
                                />
                              </TableCell>
                            )}
                            <TableCell align="right">
                              <IconButton
                                size="small"
                                onClick={() => handleEditEntry(entry)}
                                color="primary"
                              >
                                <Edit fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => handleDeleteEntry(entry)}
                                color="error"
                              >
                                <Delete fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {/* Infinite scroll trigger */}
                    <Box ref={observerTarget} sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                      {loadingMore && <CircularProgress size={24} />}
                      {!hasMore && entries.length > 0 && (
                        <Typography variant="body2" color="text.secondary">
                          No more entries
                        </Typography>
                      )}
                    </Box>
                  </>
                )}
              </Paper>
            )}
          </Box>
        </DialogContent>
      </Dialog>

      <GoalEntryDialog
        open={entryDialog.open}
        onClose={() => setEntryDialog({ open: false, entry: null, saving: false, error: null })}
        onSave={handleSaveEntry}
        goal={goal}
        entry={entryDialog.entry}
        saving={entryDialog.saving}
        error={entryDialog.error}
      />
    </>
  );
};

export default GoalDetailsModal;

