import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  IconButton,
  Switch,
  FormControlLabel,
  Chip,
  CircularProgress,
  Alert,
  LinearProgress,
  Collapse,
  Checkbox,
} from '@mui/material';
import { Edit, Add, ExpandMore, ExpandLess, Delete } from '@mui/icons-material';
import { useAuth } from 'AuthContext';
import useGoalsContext from 'contexts/Goals';
import { 
  getGoalEntries,
  getGoalProgress,
  createGoalEntry,
  updateGoalEntry,
  deleteGoalEntry,
  updateMilestone,
} from 'services/goals/goals.service';
import GoalFormModal from 'components/Goals/GoalFormModal';
import TodaysGoals from 'components/QuickGoalCompletion';
import GoalEntryDialog from 'components/Goals/GoalEntryDialog';
import GoalEntryList from 'components/Goals/GoalEntryList';
import Layout from 'components/Layout';
import { getPeriodBoundaries, getProgressText, normalizeGoalType } from 'utils/goalHelpers';

const Goals = () => {
  const { user } = useAuth();
  const { goals, loading, error, addGoal, updateGoal, deleteGoal } = useGoalsContext();
  const [localError, setLocalError] = useState(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [expandedGoals, setExpandedGoals] = useState(new Set());
  const [goalEntries, setGoalEntries] = useState({});
  const [goalProgress, setGoalProgress] = useState({});
  const [entriesLoading, setEntriesLoading] = useState({});
  const [entryDialog, setEntryDialog] = useState({ open: false, goal: null, entry: null, saving: false, error: null });

  const fetchGoalDetails = async (goal) => {
    if (!user) return;

    const goalId = goal.id;
    
    // Only fetch entries and progress for habit/metric goals with cadence
    if (goal.type === 'habit' || goal.type === 'metric') {
      if (!goal.cadence) return;
      
      setEntriesLoading(prev => ({ ...prev, [goalId]: true }));

      try {
        // Get current period boundaries
        const { start, end } = getPeriodBoundaries(goal.cadence);
        
        // Fetch entries for current period
        const entries = await getGoalEntries(user.uid, goalId, start, end);
        setGoalEntries(prev => ({ ...prev, [goalId]: entries }));

        // Fetch progress
        const progress = await getGoalProgress(user.uid, goalId);
        setGoalProgress(prev => ({ ...prev, [goalId]: progress }));
      } catch (err) {
        console.error('Failed to fetch goal details:', err);
      } finally {
        setEntriesLoading(prev => ({ ...prev, [goalId]: false }));
      }
    }
    // For milestone and one-time goals, we don't need to fetch entries
  };

  const handleToggleExpand = async (goalId) => {
    const newExpanded = new Set(expandedGoals);
    if (newExpanded.has(goalId)) {
      newExpanded.delete(goalId);
    } else {
      newExpanded.add(goalId);
      // Fetch details when expanding
      const goal = goals.find(g => g.id === goalId);
      if (goal) {
        await fetchGoalDetails(goal);
      }
    }
    setExpandedGoals(newExpanded);
  };

  const handleCreateGoal = () => {
    setEditingGoal(null);
    setModalOpen(true);
  };

  const handleEditGoal = (goal) => {
    setEditingGoal(goal);
    setModalOpen(true);
  };

  const handleSaveGoal = async (goalData) => {
    if (!user) return;

    try {
      if (editingGoal) {
        await updateGoal(editingGoal.id, goalData);
      } else {
        await addGoal(goalData);
      }
      setModalOpen(false);
    } catch (err) {
      setLocalError('Failed to save goal');
    }
  };

  const handleDeleteGoal = async (goalId) => {
    if (!user || !window.confirm('Are you sure you want to delete this goal?')) return;

    try {
      await deleteGoal(goalId);
    } catch (err) {
      setLocalError('Failed to delete goal');
    }
  };

  const handleAddEntry = (goal) => {
    setEntryDialog({ open: true, goal, entry: null, saving: false, error: null });
  };

  const handleEditEntry = (goal, entry) => {
    setEntryDialog({ open: true, goal, entry, saving: false, error: null });
  };

  const handleDeleteEntry = async (goal, entry) => {
    if (!user || !window.confirm('Are you sure you want to delete this entry?')) return;

    const goalId = goal.id;
    const entryId = entry.id;

    // Optimistically remove entry from local state
    setGoalEntries(prev => {
      const entries = prev[goalId] || [];
      return {
        ...prev,
        [goalId]: entries.filter(e => e.id !== entryId)
      };
    });

    try {
      await deleteGoalEntry(user.uid, goalId, entryId);
      
      // Refetch progress only (not full goal details)
      try {
        const progress = await getGoalProgress(user.uid, goalId);
        setGoalProgress(prev => ({ ...prev, [goalId]: progress }));
      } catch (err) {
        // If progress fetch fails, refresh full goal details
        await fetchGoalDetails(goal);
      }
    } catch (err) {
      // Revert on error - refresh entries
      await fetchGoalDetails(goal);
      setLocalError('Failed to delete entry');
    }
  };

  // Listen for entry changes from Quick Goal Completion component
  useEffect(() => {
    const handleEntryChange = async (event) => {
      const { goalId, goalType } = event.detail;
      // Only refetch if this goal is currently expanded
      if (expandedGoals.has(goalId) && (goalType === 'habit' || goalType === 'metric')) {
        const goal = goals.find(g => g.id === goalId);
        if (goal) {
          await fetchGoalDetails(goal);
        }
      }
    };

    window.addEventListener('goalEntryChanged', handleEntryChange);
    return () => {
      window.removeEventListener('goalEntryChanged', handleEntryChange);
    };
  }, [expandedGoals, goals, user, fetchGoalDetails]);

  const handleSaveEntry = async (entryData) => {
    if (!user || !entryDialog.goal) return;

    const goal = entryDialog.goal;
    const goalId = goal.id;
    const isUpdate = !!entryDialog.entry;

    // Set saving state
    setEntryDialog(prev => ({ ...prev, saving: true, error: null }));

    let savedEntry = null;
    let optimisticEntryId = null;

    try {
      if (isUpdate) {
        // Update existing entry
        savedEntry = await updateGoalEntry(user.uid, goalId, entryDialog.entry.id, entryData);
        
        // Optimistically update entry in local state
        setGoalEntries(prev => {
          const entries = prev[goalId] || [];
          return {
            ...prev,
            [goalId]: entries.map(e => 
              e.id === entryDialog.entry.id 
                ? { ...e, ...entryData, ...savedEntry }
                : e
            )
          };
        });
      } else {
        // Create new entry
        savedEntry = await createGoalEntry(user.uid, goalId, entryData);
        optimisticEntryId = savedEntry?.id || Date.now(); // Use timestamp as fallback
        
        // Optimistically add entry to local state
        setGoalEntries(prev => {
          const entries = prev[goalId] || [];
          return {
            ...prev,
            [goalId]: [...entries, savedEntry]
          };
        });
      }
      
      // Refetch progress only (not full goal details)
      try {
        const progress = await getGoalProgress(user.uid, goalId);
        setGoalProgress(prev => ({ ...prev, [goalId]: progress }));
      } catch (err) {
        // If progress fetch fails, refresh full goal details
        await fetchGoalDetails(goal);
      }
      
      // Close dialog on success
      setEntryDialog({ open: false, goal: null, entry: null, saving: false, error: null });
    } catch (err) {
      // Keep dialog open on error and show error message
      setEntryDialog(prev => ({ 
        ...prev, 
        saving: false, 
        error: err.message || 'Failed to save entry'
      }));
      
      // Revert optimistic update on error
      if (isUpdate) {
        // Refresh entries to revert
        await fetchGoalDetails(goal);
      } else {
        // Remove optimistically added entry
        const entryIdToRemove = savedEntry?.id || optimisticEntryId;
        setGoalEntries(prev => {
          const entries = prev[goalId] || [];
          return {
            ...prev,
            [goalId]: entries.filter(e => e.id !== entryIdToRemove)
          };
        });
      }
    }
  };

  const handleToggleMilestone = async (goal, milestone) => {
    if (!user) return;

    try {
      await updateMilestone(user.uid, goal.id, milestone.id, { done: !milestone.done });
      // Update the goal in context to reflect milestone change
      const updatedMilestones = goal.milestones.map(m => 
        m.id === milestone.id 
          ? { ...m, done: !m.done, doneAt: !m.done ? new Date().toISOString() : null }
          : m
      );
      await updateGoal(goal.id, { milestones: updatedMilestones });
    } catch (err) {
      setLocalError('Failed to update milestone');
    }
  };

  const handleToggleOneTimeGoal = async (goal) => {
    if (!user) return;

    const newCompleted = !goal.completed;

    try {
      // Update goal with new completion status
      await updateGoal(goal.id, {
        completed: newCompleted,
        completedAt: newCompleted ? new Date().toISOString() : null,
      });
    } catch (err) {
      setLocalError('Failed to update goal');
    }
  };

  const getTrackingTypeLabel = (goal) => {
    const goalType = normalizeGoalType(goal.type);
    switch (goalType) {
      case 'habit': 
        return goal.cadence ? `${goal.cadence.charAt(0).toUpperCase() + goal.cadence.slice(1)} Habit` : 'Habit';
      case 'metric': 
        return goal.cadence ? `${goal.cadence.charAt(0).toUpperCase() + goal.cadence.slice(1)} Metric` : 'Metric';
      case 'milestone': return 'Milestone';
      case 'one_time':
        return 'One-time';
      default: return goal.type || 'Goal';
    }
  };

  const getTrackingTypeColor = (type) => {
    const goalType = normalizeGoalType(type);
    switch (goalType) {
      case 'habit': return 'success';
      case 'metric': return 'warning';
      case 'milestone': return 'secondary';
      case 'one_time':
        return 'primary';
      default: return 'default';
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'No date';
    try {
      if (timestamp instanceof Date) return timestamp.toLocaleDateString();
      const date = new Date(timestamp);
      return isNaN(date.getTime()) ? 'Invalid date' : date.toLocaleDateString();
    } catch (error) {
      return 'Invalid date';
    }
  };

  const getProgressInfo = (goal) => {
    const progress = goalProgress[goal.id];
    
    switch (goal.type) {
      case 'one_time':
      case 'one-time':
        return goal.completed ? 'Completed' : `Due: ${formatDate(goal.dueAt || goal.due_at)}`;
      case 'milestone':
        const completedMilestones = goal.milestones?.filter(m => m.done).length || 0;
        const totalMilestones = goal.milestones?.length || 0;
        return `${completedMilestones}/${totalMilestones} milestones`;
      case 'habit':
      case 'metric':
        if (progress) {
          return getProgressText(goal, progress);
        }
        // Fallback to target info
        if (goal.type === 'habit') {
          return goal.cadence ? `Target: ${goal.targetCount || goal.target_count || 0} times/${goal.cadence}` : 'No target set';
        } else {
          return goal.cadence ? `Target: ${goal.targetQuantity || goal.target_quantity || 0} ${goal.unit || ''}/${goal.cadence}` : 'No target set';
        }
      default:
        return 'No progress info';
    }
  };

  const getProgressBarValue = (goal) => {
    const progress = goalProgress[goal.id];
    if (!progress || !progress.target) return 0;
    return Math.min((progress.actual / progress.target) * 100, 100);
  };

  const filteredGoals = goals.filter(goal => {
    if (showCompleted) return true;
    return !goal.completed;
  });

  const renderExpandedContent = (goal) => {
    if (goal.type === 'habit' || goal.type === 'metric') {
      const entries = goalEntries[goal.id] || [];
      const progress = goalProgress[goal.id];
      const loading = entriesLoading[goal.id];

      return (
        <Box sx={{ p: 2 }}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Current Period Progress
            </Typography>
            {progress && (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                  <Typography variant="body2" sx={{ minWidth: 120 }}>
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
              </>
            )}
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="subtitle2">Entries</Typography>
            <Button
              size="small"
              variant="outlined"
              startIcon={<Add />}
              onClick={() => handleAddEntry(goal)}
            >
              Add Entry
            </Button>
          </Box>

          <GoalEntryList
            entries={entries}
            goal={goal}
            onEdit={(entry) => handleEditEntry(goal, entry)}
            onDelete={(entry) => handleDeleteEntry(goal, entry)}
            loading={entriesLoading[goal.id]}
          />
        </Box>
      );
    } else if (goal.type === 'milestone') {
      const milestones = goal.milestones || [];
      
      return (
        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Milestones
          </Typography>
          {milestones.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No milestones defined
            </Typography>
          ) : (
            milestones.map((milestone) => {
              if (!milestone || !milestone.id) return null;
              
              return (
                <Box key={milestone.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Checkbox
                    checked={milestone.done || false}
                    onChange={() => handleToggleMilestone(goal, milestone)}
                    size="small"
                    disabled={!milestone.id}
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
      );
    } else if (normalizeGoalType(goal.type) === 'one_time') {
      return (
        <Box sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Checkbox
              checked={goal.completed || false}
              onChange={() => handleToggleOneTimeGoal(goal)}
              size="small"
            />
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" sx={{ textDecoration: goal.completed ? 'line-through' : 'none', opacity: goal.completed ? 0.6 : 1 }}>
                {goal.completed ? 'Completed' : 'Not completed'}
              </Typography>
              {goal.completedAt || goal.completed_at ? (
                <Typography variant="caption" color="text.secondary">
                  Completed: {formatDate(goal.completedAt || goal.completed_at)}
                </Typography>
              ) : null}
            </Box>
          </Box>
          {goal.dueAt || goal.due_at ? (
            <Typography variant="body2" color="text.secondary">
              Due: {formatDate(goal.dueAt || goal.due_at)}
            </Typography>
          ) : null}
        </Box>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Layout>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
          <CircularProgress />
        </Box>
      </Layout>
    );
  }

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4">Goals</Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleCreateGoal}
          >
            Create Goal
          </Button>
        </Box>

        <Box sx={{ mb: 3 }}>
          <TodaysGoals />
        </Box>

        <Box sx={{ mb: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={showCompleted}
                onChange={(e) => setShowCompleted(e.target.checked)}
              />
            }
            label="Show completed goals"
          />
        </Box>

        {(error || localError) && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setLocalError(null)}>
            {error || localError}
          </Alert>
        )}

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell width={50}></TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Progress</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredGoals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography color="text.secondary">
                      {showCompleted ? 'No completed goals' : 'No active goals. Create your first goal!'}
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredGoals.map((goal) => {
                  const isExpanded = expandedGoals.has(goal.id);
                  const progress = goalProgress[goal.id];
                  const hasProgress = progress && (goal.type === 'habit' || goal.type === 'metric');

                  return (
                    <React.Fragment key={goal.id}>
                      <TableRow sx={{ opacity: goal.completed ? 0.6 : 1 }}>
                        <TableCell>
                          {(goal.type === 'habit' || goal.type === 'metric' || goal.type === 'milestone' || normalizeGoalType(goal.type) === 'one_time') && (
                            <IconButton
                              size="small"
                              onClick={() => handleToggleExpand(goal.id)}
                            >
                              {isExpanded ? <ExpandLess /> : <ExpandMore />}
                            </IconButton>
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="subtitle1" sx={{ fontWeight: goal.completed ? 'normal' : 'bold' }}>
                            {goal.title}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={getTrackingTypeLabel(goal)}
                            color={getTrackingTypeColor(goal.type)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {getProgressInfo(goal)}
                          </Typography>
                          {hasProgress && (
                            <LinearProgress
                              variant="determinate"
                              value={getProgressBarValue(goal)}
                              sx={{ height: 4, borderRadius: 1, mt: 0.5 }}
                              color={progress.completed ? 'success' : 'primary'}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <IconButton
                            onClick={() => handleEditGoal(goal)}
                            size="small"
                            color="primary"
                          >
                            <Edit />
                          </IconButton>
                          {(goal.type === 'habit' || goal.type === 'metric' || goal.type === 'milestone' || normalizeGoalType(goal.type) === 'one_time') && (
                            <IconButton
                              onClick={() => handleToggleExpand(goal.id)}
                              size="small"
                            >
                              {isExpanded ? <ExpandLess /> : <ExpandMore />}
                            </IconButton>
                          )}
                        </TableCell>
                      </TableRow>
                      {(goal.type === 'habit' || goal.type === 'metric' || goal.type === 'milestone' || goal.type === 'one_time' || goal.type === 'one-time') && (
                        <TableRow>
                          <TableCell colSpan={5} sx={{ py: 0, borderBottom: isExpanded ? '1px solid rgba(224, 224, 224, 1)' : 'none' }}>
                            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                              {renderExpandedContent(goal)}
                            </Collapse>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <GoalFormModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSave={handleSaveGoal}
          onArchive={handleDeleteGoal}
          editingGoal={editingGoal}
        />

        <GoalEntryDialog
          open={entryDialog.open}
          onClose={() => setEntryDialog({ open: false, goal: null, entry: null, saving: false, error: null })}
          onSave={handleSaveEntry}
          goal={entryDialog.goal}
          entry={entryDialog.entry}
          saving={entryDialog.saving}
          error={entryDialog.error}
        />
      </Box>
    </Layout>
  );
};

export default Goals;
