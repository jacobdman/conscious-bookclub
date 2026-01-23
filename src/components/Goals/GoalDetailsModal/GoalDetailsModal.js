import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
  Checkbox,
  TextField,
  DialogActions,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import { Close, Add, Edit, Delete, DragIndicator, ExpandMore } from '@mui/icons-material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { useAuth } from 'AuthContext';
import useClubContext from 'contexts/Club';
import useGoalsContext from 'contexts/Goals';
import GoalCompletionShareDialog from 'components/GoalCompletionShareDialog';
import GoalEntryDialog from 'components/Goals/GoalEntryDialog';
import MonthlyStreakGrid from 'components/MonthlyStreakGrid';
import { createPost } from 'services/posts/posts.service';
import { getGoalProgress } from 'services/goals/goals.service';
import { 
  getProgressText, 
  getProgressBarValue,
  formatDate,
  getPeriodBoundaries,
} from 'utils/goalHelpers';

const GoalDetailsModal = ({ open, onClose, goal: goalProp }) => {
  const { user } = useAuth();
  const { currentClub } = useClubContext();
  const { 
    goals, 
    updateGoal,
    createEntry,
    updateEntry,
    deleteEntry,
    fetchGoalEntries,
    fetchGoalEntriesForMonth,
    createMilestone,
    deleteMilestone,
    updateMilestone,
    bulkUpdateMilestones,
  } = useGoalsContext();
  const [entryDialog, setEntryDialog] = useState({ open: false, entry: null, saving: false, error: null, initialDate: null });
  const [draggedMilestoneId, setDraggedMilestoneId] = useState(null);
  const [draggedOverMilestoneId, setDraggedOverMilestoneId] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [updatingMilestones, setUpdatingMilestones] = useState({});
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [addingMilestone, setAddingMilestone] = useState(false);
  const [deletingMilestones, setDeletingMilestones] = useState({});
  const [milestoneDateDialog, setMilestoneDateDialog] = useState({
    open: false,
    milestoneId: null,
    value: null,
    saving: false,
  });
  const [monthCursor, setMonthCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [monthEntries, setMonthEntries] = useState([]);
  const [monthEntriesPool, setMonthEntriesPool] = useState([]);
  const [monthEntriesLoading, setMonthEntriesLoading] = useState(false);
  const [weekEntriesPool, setWeekEntriesPool] = useState([]);
  const [shareDialog, setShareDialog] = useState({ open: false, goal: null, label: '' });
  const observerTarget = useRef(null);
  const initialEntriesLoaded = useRef({});
  const INITIAL_LIMIT = 20;
  const LOAD_MORE_LIMIT = 20;

  // Get the current goal from the provider context to ensure we have the latest version
  // This ensures the UI updates when milestones are toggled
  const goal = goalProp?.id ? goals.find(g => g.id === goalProp.id) || goalProp : goalProp;
  
  // Get entries and pagination from goal
  const entries = goal?.entries || [];
  const entriesPagination = useMemo(() => {
    return goal?.entriesPagination || { hasMore: true, offset: 0, limit: INITIAL_LIMIT };
  }, [goal?.entriesPagination]);
  const hasMore = entriesPagination.hasMore;

  // Load more entries when scrolling to bottom
  useEffect(() => {
    if (!open || !goal || (goal.type !== 'habit' && goal.type !== 'metric')) return;

    const observer = new IntersectionObserver(
      async (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          try {
            setLoadingMore(true);
            const currentOffset = entriesPagination.offset || 0;
            await fetchGoalEntries(goal.id, LOAD_MORE_LIMIT, currentOffset, true);
          } catch (err) {
            console.error('Failed to load more entries:', err);
          } finally {
            setLoadingMore(false);
          }
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
  }, [open, goal, hasMore, loadingMore, entriesPagination, fetchGoalEntries]);

  // Fetch initial entries when modal opens or goal changes
  useEffect(() => {
    if (!open || !goal || (goal.type !== 'habit' && goal.type !== 'metric')) return;

    if (!initialEntriesLoaded.current[goal.id]) {
      initialEntriesLoaded.current[goal.id] = true;
      fetchGoalEntries(goal.id, INITIAL_LIMIT, 0, false);
    }
  }, [open, goal, fetchGoalEntries]);

  useEffect(() => {
    if (!open && goal?.id) {
      delete initialEntriesLoaded.current[goal.id];
    }
  }, [open, goal?.id]);

  useEffect(() => {
    if (!open || !goal?.id) return;
    const now = new Date();
    setMonthCursor(new Date(now.getFullYear(), now.getMonth(), 1));
  }, [open, goal?.id]);

  const loadMonthEntries = useCallback(async (targetMonth = monthCursor) => {
    if (!goal || (goal.type !== 'habit' && goal.type !== 'metric')) return;

    try {
      setMonthEntriesLoading(true);
      const entriesForMonth = await fetchGoalEntriesForMonth(goal.id, targetMonth);
      setMonthEntries(entriesForMonth || []);

      const year = targetMonth.getFullYear();
      const month = targetMonth.getMonth();
      const monthsToLoad = [
        new Date(year, month - 1, 1),
        new Date(year, month, 1),
        new Date(year, month + 1, 1),
      ];
      const monthEntriesList = await Promise.all(
        monthsToLoad.map((monthDate) => fetchGoalEntriesForMonth(goal.id, monthDate))
      );
      const combinedEntries = [];
      const entryIds = new Set();
      monthEntriesList.flat().forEach((entry) => {
        if (!entry || entryIds.has(entry.id)) return;
        entryIds.add(entry.id);
        combinedEntries.push(entry);
      });
      setMonthEntriesPool(combinedEntries);
    } catch (err) {
      console.error('Failed to load month entries:', err);
    } finally {
      setMonthEntriesLoading(false);
    }
  }, [goal, fetchGoalEntriesForMonth, monthCursor]);

  const loadWeekEntriesPool = useCallback(async () => {
    if (!goal || (goal.type !== 'habit' && goal.type !== 'metric')) return;
    if (goal.cadence !== 'week') {
      setWeekEntriesPool([]);
      return;
    }

    try {
      const year = monthCursor.getFullYear();
      const month = monthCursor.getMonth();
      const monthsToLoad = [
        new Date(year, month - 1, 1),
        new Date(year, month, 1),
        new Date(year, month + 1, 1),
      ];

      const monthEntriesList = await Promise.all(
        monthsToLoad.map((monthDate) => fetchGoalEntriesForMonth(goal.id, monthDate))
      );

      const combinedEntries = [];
      const entryIds = new Set();
      monthEntriesList.flat().forEach((entry) => {
        if (!entry || entryIds.has(entry.id)) return;
        entryIds.add(entry.id);
        combinedEntries.push(entry);
      });

      setWeekEntriesPool(combinedEntries);
    } catch (err) {
      console.error('Failed to load week entries pool:', err);
    }
  }, [goal, fetchGoalEntriesForMonth, monthCursor]);

  useEffect(() => {
    if (!open || !goal || (goal.type !== 'habit' && goal.type !== 'metric')) return;

    loadMonthEntries();
    loadWeekEntriesPool();
  }, [open, goal, monthCursor, loadMonthEntries, loadWeekEntriesPool]);

  const getCompletionLabel = (goalItem, detail = null) => {
    const baseLabel = goalItem?.title || 'this goal';
    if (detail) {
      return `${baseLabel}: ${detail}`;
    }
    return baseLabel;
  };

  const openShareDialog = (goalItem, detail = null) => {
    setShareDialog({ open: true, goal: goalItem, label: getCompletionLabel(goalItem, detail) });
  };

  const closeShareDialog = () => {
    setShareDialog({ open: false, goal: null, label: '' });
  };

  const handleShareConfirm = async () => {
    if (!user || !currentClub || !shareDialog.goal) {
      closeShareDialog();
      return;
    }

    try {
      await createPost(currentClub.id, {
        text: '{goal_completion_post}',
        isActivity: true,
        isSpoiler: false,
        relatedRecordType: 'goal',
        relatedRecordId: shareDialog.goal.id,
        authorId: user.uid,
        authorName: user.displayName || user.email,
      });
    } catch (err) {
      console.error('Failed to share goal completion:', err);
    } finally {
      closeShareDialog();
    }
  };

  const checkGoalProgressCompletion = async (goalItem) => {
    if (!user || !goalItem) return;
    const wasCompleted = !!goalItem.progress?.completed;
    try {
      const progress = await getGoalProgress(user.uid, goalItem.id);
      if (progress?.completed && !wasCompleted) {
        openShareDialog(goalItem);
      }
    } catch (err) {
      console.error('Failed to check goal progress:', err);
    }
  };

  const handleAddEntry = () => {
    setEntryDialog({ open: true, entry: null, saving: false, error: null, initialDate: null });
  };

  const handleEditEntry = (entry) => {
    setEntryDialog({ open: true, entry, saving: false, error: null, initialDate: null });
  };

  const handleDayEntry = (dateValue) => {
    setEntryDialog({ open: true, entry: null, saving: false, error: null, initialDate: dateValue });
  };

  const handleDeleteEntry = async (entry) => {
    if (!user || !window.confirm('Are you sure you want to delete this entry?')) return;

    try {
      await deleteEntry(goal.id, entry.id);
      await loadMonthEntries();
      await loadWeekEntriesPool();
    } catch (err) {
      console.error('Failed to delete entry:', err);
    }
  };

  const handleSaveEntry = async (entryData) => {
    if (!user || !goal) return;

    const isUpdate = !!entryDialog.entry;
    if (entryDialog.saving) return;

    setEntryDialog(prev => ({ ...prev, saving: true, error: null }));

    try {
      if (isUpdate) {
        await updateEntry(goal.id, entryDialog.entry.id, entryData);
      } else {
        await createEntry(goal.id, entryData);
        await checkGoalProgressCompletion(goal);
      }

      await loadMonthEntries();
      await loadWeekEntriesPool();
      
      setEntryDialog({ open: false, entry: null, saving: false, error: null });
    } catch (err) {
      setEntryDialog(prev => ({ 
        ...prev, 
        saving: false, 
        error: err.message || 'Failed to save entry'
      }));
    }
  };

  const handleAddMilestone = async () => {
    if (!user || !goal) return;
    const title = newMilestoneTitle.trim();
    if (!title) return;

    try {
      setAddingMilestone(true);
      const nextOrder = (goal.milestones || []).length;
      await createMilestone(goal.id, {
        title,
        order: nextOrder,
        done: false,
      });
      setNewMilestoneTitle('');
    } catch (err) {
      console.error('Failed to add milestone:', err);
    } finally {
      setAddingMilestone(false);
    }
  };

  const handleDeleteMilestone = async (milestoneId) => {
    if (!user || !goal || !milestoneId) return;

    const normalizedId = typeof milestoneId === 'string' ? parseInt(milestoneId, 10) : milestoneId;

    try {
      setDeletingMilestones(prev => ({ ...prev, [normalizedId]: true }));
      await deleteMilestone(goal.id, normalizedId);
    } catch (err) {
      console.error('Failed to delete milestone:', err);
    } finally {
      setDeletingMilestones(prev => {
        const next = { ...prev };
        delete next[normalizedId];
        return next;
      });
    }
  };

  const handleOpenMilestoneDate = (milestone) => {
    if (!milestone) return;
    const currentDate = milestone.doneAt ? new Date(milestone.doneAt) : new Date();
    setMilestoneDateDialog({
      open: true,
      milestoneId: milestone.id,
      value: currentDate,
      saving: false,
    });
  };

  const handleSaveMilestoneDate = async () => {
    if (!user || !goal || !milestoneDateDialog.milestoneId || !milestoneDateDialog.value) return;

    try {
      setMilestoneDateDialog(prev => ({ ...prev, saving: true }));
      await updateMilestone(goal.id, milestoneDateDialog.milestoneId, {
        done: true,
        doneAt: milestoneDateDialog.value.toISOString(),
      });
      setMilestoneDateDialog({
        open: false,
        milestoneId: null,
        value: null,
        saving: false,
      });
    } catch (err) {
      console.error('Failed to update milestone date:', err);
      setMilestoneDateDialog(prev => ({ ...prev, saving: false }));
    }
  };

  const handleToggleMilestone = async (milestone) => {
    if (!user || !goal) return;

    const milestoneId = milestone.id || milestone.ID;
    const milestoneIdNum = typeof milestoneId === 'string' ? parseInt(milestoneId, 10) : milestoneId;
    
    // Prevent multiple clicks
    if (updatingMilestones[milestoneIdNum]) {
      return;
    }

    const newDoneState = !milestone.done;
    const remainingIncomplete = (goal.milestones || []).filter(m => !m.done);
    const isLastIncomplete = newDoneState && remainingIncomplete.length === 1;

    try {
      setUpdatingMilestones(prev => ({ ...prev, [milestoneIdNum]: true }));
      await updateMilestone(goal.id, milestoneIdNum, { 
        done: newDoneState,
        doneAt: newDoneState ? new Date().toISOString() : null
      });
      if (isLastIncomplete) {
        openShareDialog(goal);
      }
    } catch (err) {
      console.error('Failed to update milestone:', err);
    } finally {
      setUpdatingMilestones(prev => {
        const next = { ...prev };
        delete next[milestoneIdNum];
        return next;
      });
    }
  };

  const handleDragStart = (e, milestoneId) => {
    setDraggedMilestoneId(milestoneId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', milestoneId);
  };

  const handleDragOver = (e, milestoneId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (milestoneId !== draggedOverMilestoneId) {
      setDraggedOverMilestoneId(milestoneId);
    }
  };

  const handleDragLeave = () => {
    setDraggedOverMilestoneId(null);
  };

  const handleDrop = async (e, targetMilestoneId) => {
    e.preventDefault();
    setDraggedOverMilestoneId(null);

    if (!draggedMilestoneId || draggedMilestoneId === targetMilestoneId) {
      setDraggedMilestoneId(null);
      return;
    }

    if (!user || !goal) {
      setDraggedMilestoneId(null);
      return;
    }

    try {
      // Get sorted milestones by order
      const sortedMilestones = [...(goal.milestones || [])].sort((a, b) => {
        const orderA = a.order !== undefined ? a.order : (a.id || 0);
        const orderB = b.order !== undefined ? b.order : (b.id || 0);
        return orderA - orderB;
      });

      const draggedIndex = sortedMilestones.findIndex(m => m.id === draggedMilestoneId);
      const targetIndex = sortedMilestones.findIndex(m => m.id === targetMilestoneId);

      if (draggedIndex === -1 || targetIndex === -1) {
        setDraggedMilestoneId(null);
        return;
      }

      // Reorder milestones array
      const reorderedMilestones = [...sortedMilestones];
      const [draggedMilestone] = reorderedMilestones.splice(draggedIndex, 1);
      reorderedMilestones.splice(targetIndex, 0, draggedMilestone);

      // Update order for all milestones
      const updatedMilestones = reorderedMilestones.map((milestone, index) => ({
        ...milestone,
        order: index,
      }));

      // Use bulk update to update all milestones at once
      await bulkUpdateMilestones(goal.id, updatedMilestones);
    } catch (err) {
      console.error('Failed to reorder milestones:', err);
    } finally {
      setDraggedMilestoneId(null);
    }
  };

  const handleDragEnd = () => {
    setDraggedMilestoneId(null);
    setDraggedOverMilestoneId(null);
  };

  const handleToggleOneTimeGoal = async () => {
    if (!user || !goal || goal.type !== 'one_time') return;

    const newCompleted = !goal.completed;

    try {
      await updateGoal(goal.id, {
        completed: newCompleted,
        completedAt: newCompleted ? new Date().toISOString() : null,
      });
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

  const progress = goal?.progress;
  const hasProgress = progress && (goal?.type === 'habit' || goal?.type === 'metric');

  const getPercentForEntries = useCallback((entriesForPeriod) => {
    if (!goal || !entriesForPeriod) return null;
    if (goal.cadence !== 'week' && goal.cadence !== 'month') return null;

    const actual = goal.measure === 'sum'
      ? entriesForPeriod.reduce((acc, entry) => acc + (parseFloat(entry.quantity) || 0), 0)
      : entriesForPeriod.length;
    const targetValue = goal.measure === 'sum'
      ? parseFloat(goal.targetQuantity || goal.target || 0)
      : parseFloat(goal.targetCount || goal.target || 0);

    if (!targetValue) return 0;
    return Math.round(Math.min((actual / targetValue) * 100, 100));
  }, [goal]);

  const weeklyProgressByRow = useMemo(() => {
    if (goal?.cadence !== 'week') return null;
    const year = monthCursor.getFullYear();
    const month = monthCursor.getMonth();
    const firstDayOfMonth = new Date(year, month, 1).getDay();

    return Array.from({ length: 5 }, (_, rowIndex) => {
      const anchorDate = new Date(year, month, 1 - firstDayOfMonth + (rowIndex * 7));
      const { start, end } = getPeriodBoundaries('week', anchorDate);
      const entriesForWeek = (weekEntriesPool || []).filter(entry => {
        const entryDate = new Date(entry.occurred_at || entry.occurredAt || 0);
        return entryDate >= start && entryDate < end;
      });

      return getPercentForEntries(entriesForWeek);
    });
  }, [goal?.cadence, monthCursor, weekEntriesPool, getPercentForEntries]);

  const monthProgressPercent = useMemo(() => (
    goal?.cadence === 'month' ? getPercentForEntries(monthEntries) : null
  ), [goal?.cadence, getPercentForEntries, monthEntries]);

  const handlePrevMonth = () => {
    setMonthCursor(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setMonthCursor(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  if (!goal) return null;

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
          <Typography variant="h5" component="div">{goal.title}</Typography>
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
                    [...(goal.milestones || [])]
                      .sort((a, b) => {
                        const orderA = a.order !== undefined ? a.order : (a.id || 0);
                        const orderB = b.order !== undefined ? b.order : (b.id || 0);
                        return orderA - orderB;
                      })
                      .map((milestone) => {
                        if (!milestone || !milestone.id) return null;
                        
                        const isDragging = draggedMilestoneId === milestone.id;
                        const isDraggedOver = draggedOverMilestoneId === milestone.id;
                        
                        return (
                          <Box
                            key={milestone.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, milestone.id)}
                            onDragOver={(e) => handleDragOver(e, milestone.id)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, milestone.id)}
                            onDragEnd={handleDragEnd}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 1,
                              mb: 1,
                              p: 1,
                              borderRadius: 1,
                              cursor: 'move',
                              opacity: isDragging ? 0.5 : 1,
                              backgroundColor: isDraggedOver ? 'action.hover' : 'transparent',
                              '&:hover': {
                                backgroundColor: 'action.hover',
                              },
                            }}
                          >
                            <DragIndicator
                              sx={{
                                color: 'text.secondary',
                                cursor: 'grab',
                                '&:active': {
                                  cursor: 'grabbing',
                                },
                              }}
                            />
                            <Checkbox
                              checked={milestone.done || false}
                              onChange={() => handleToggleMilestone(milestone)}
                              disabled={!milestone.id || updatingMilestones[milestone.id]}
                              size="small"
                            />
                            {updatingMilestones[milestone.id] && (
                              <CircularProgress size={16} sx={{ ml: 1 }} />
                            )}
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
                            {milestone.done && (
                              <IconButton
                                size="small"
                                onClick={() => handleOpenMilestoneDate(milestone)}
                                color="primary"
                              >
                                <Edit fontSize="small" />
                              </IconButton>
                            )}
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteMilestone(milestone.id)}
                              color="error"
                              disabled={deletingMilestones[milestone.id]}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                            {deletingMilestones[milestone.id] && (
                              <CircularProgress size={16} />
                            )}
                          </Box>
                        );
                      })
                  )}
                  <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                    <TextField
                      label="New milestone"
                      size="small"
                      value={newMilestoneTitle}
                      onChange={(e) => setNewMilestoneTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleAddMilestone();
                        }
                      }}
                      fullWidth
                      disabled={addingMilestone}
                    />
                    <Button
                      variant="contained"
                      startIcon={<Add />}
                      onClick={handleAddMilestone}
                      disabled={!newMilestoneTitle.trim() || addingMilestone}
                    >
                      {addingMilestone ? 'Adding...' : 'Add'}
                    </Button>
                  </Box>
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
              <>
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={handleAddEntry}
                  >
                    Add Entry
                  </Button>
                </Box>

                <MonthlyStreakGrid
                  entries={monthEntriesPool}
                  monthDate={monthCursor}
                  onPrevMonth={handlePrevMonth}
                  onNextMonth={handleNextMonth}
                  onDayClick={handleDayEntry}
                  cadence={goal.cadence}
                  progressPercent={monthProgressPercent}
                  weeklyProgressByRow={weeklyProgressByRow}
                />

                <Accordion defaultExpanded={false} sx={{ boxShadow: 1 }}>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography variant="h6">Entry History</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    {monthEntriesLoading && entries.length === 0 ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                        <CircularProgress size={24} />
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
                  </AccordionDetails>
                </Accordion>
              </>
            )}
          </Box>
        </DialogContent>
      </Dialog>

      <GoalEntryDialog
        open={entryDialog.open}
        onClose={() => setEntryDialog({ open: false, entry: null, saving: false, error: null, initialDate: null })}
        onSave={handleSaveEntry}
        goal={goal}
        entry={entryDialog.entry}
        initialDate={entryDialog.initialDate}
        saving={entryDialog.saving}
        error={entryDialog.error}
      />

      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <Dialog
          open={milestoneDateDialog.open}
          onClose={() => setMilestoneDateDialog({ open: false, milestoneId: null, value: null, saving: false })}
        >
          <DialogTitle>Edit Completion Date</DialogTitle>
          <DialogContent sx={{ pt: 1 }}>
            <DateTimePicker
              label="Completion date/time"
              value={milestoneDateDialog.value}
              onChange={(newValue) => setMilestoneDateDialog(prev => ({ ...prev, value: newValue }))}
              slotProps={{
                textField: {
                  fullWidth: true,
                  margin: 'normal',
                },
              }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setMilestoneDateDialog({ open: false, milestoneId: null, value: null, saving: false })}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveMilestoneDate}
              variant="contained"
              disabled={!milestoneDateDialog.value || milestoneDateDialog.saving}
            >
              {milestoneDateDialog.saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogActions>
        </Dialog>
      </LocalizationProvider>

      <GoalCompletionShareDialog
        open={shareDialog.open}
        onClose={closeShareDialog}
        onConfirm={handleShareConfirm}
        completionLabel={shareDialog.label}
      />
    </>
  );
};

export default GoalDetailsModal;

