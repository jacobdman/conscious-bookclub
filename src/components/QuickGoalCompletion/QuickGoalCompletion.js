import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Checkbox,
  FormControlLabel,
  CircularProgress,
  Alert,
  Chip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
} from '@mui/material';
import { useAuth } from 'AuthContext';
import useGoalsContext from 'contexts/Goals';
import { getGoalEntries, getGoalProgress, createGoalEntry, updateMilestone, deleteGoalEntry } from 'services/goals/goals.service';
import {
  filterGoalsForQuickCompletion,
  sortGoalsByPriority,
  getTodayBoundaries,
  hasEntryToday,
  getProgressText,
  formatMilestoneDisplay,
  normalizeGoalType,
  getGoalTypeLabel,
  getGoalTypeColor,
} from 'utils/goalHelpers';

const QuickGoalCompletion = () => {
  const { user } = useAuth();
  const { goals: allGoals, updateGoal } = useGoalsContext();
  const [completionStates, setCompletionStates] = useState({});
  const [progressData, setProgressData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState({});
  const [quantityDialog, setQuantityDialog] = useState({ open: false, goal: null });
  
  const fetchCompletions = useCallback(async (goalsToCheck) => {
    if (!user || !goalsToCheck || goalsToCheck.length === 0) return;

    try {
      setLoading(true);
      setError(null);

      // Check completion states and fetch data for each goal
      const completionStates = {};
      const progressData = {};
      const todayBoundaries = getTodayBoundaries();

      // Process active goals
      for (const goal of goalsToCheck) {
        // For active goals, fetch data from API
        if (goal.type === 'habit') {
          // For habits: check if entry exists TODAY
          try {
            const entries = await getGoalEntries(user.uid, goal.id, todayBoundaries.start, todayBoundaries.end);
            const hasToday = hasEntryToday(entries);
            completionStates[goal.id] = hasToday;
          } catch (err) {
            completionStates[goal.id] = false;
          }
        } else if (goal.type === 'metric') {
          // For metrics: check if entry exists TODAY (like habits)
          // Use progress from goal context if available, otherwise fetch
          try {
            const entries = await getGoalEntries(user.uid, goal.id, todayBoundaries.start, todayBoundaries.end);
            const hasToday = hasEntryToday(entries);
            completionStates[goal.id] = hasToday;
            
            // Use progress from goal context if available
            if (goal.progress) {
              progressData[goal.id] = goal.progress;
            } else {
              // Fallback: fetch progress if not in context
              const progress = await getGoalProgress(user.uid, goal.id);
              progressData[goal.id] = progress;
            }
          } catch (err) {
            completionStates[goal.id] = false;
            progressData[goal.id] = goal.progress || null;
          }
        } else if (normalizeGoalType(goal.type) === 'one_time') {
          completionStates[goal.id] = goal.completed || false;
        } else if (goal.type === 'milestone') {
          // For milestones: check if all are done
          const milestones = goal.milestones || goal.Milestones || [];
          const allDone = milestones.length > 0 && milestones.every(m => m.done);
          completionStates[goal.id] = allDone || false;
        }
      }

      // Merge completion states and progress data instead of replacing
      setCompletionStates(prev => ({ ...prev, ...completionStates }));
      setProgressData(prev => ({ ...prev, ...progressData }));
    } catch (err) {
      setError('Failed to fetch completion data');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Get filtered and sorted goals whenever allGoals changes
  const filteredGoals = useMemo(() => {
    const filtered = filterGoalsForQuickCompletion(allGoals);
    const sorted = sortGoalsByPriority(filtered);
    return sorted.slice(0, 5); // Limit to top 5
  }, [allGoals]);

  // Track previous filteredGoals to detect actual changes (not just reference equality)
  const prevFilteredGoalsRef = useRef([]);
  
  // Fetch completion states when filtered goals change (only if goals actually added/removed)
  useEffect(() => {
    const prevGoalIds = prevFilteredGoalsRef.current.map(g => g.id).sort();
    const currentGoalIds = filteredGoals.map(g => g.id).sort();
    
    // Only refetch if goals were actually added or removed (not just completion status changed)
    const goalsChanged = JSON.stringify(prevGoalIds) !== JSON.stringify(currentGoalIds);
    
    if (goalsChanged) {
      if (filteredGoals.length > 0) {
        fetchCompletions(filteredGoals);
      } else {
        // Clear completion states if no goals
        setCompletionStates({});
        setProgressData({});
      }
    }
    
    // Update ref for next comparison
    prevFilteredGoalsRef.current = filteredGoals;
  }, [filteredGoals, fetchCompletions]);


  const handleGoalToggle = async (goal) => {
    if (!user) return;

    const goalId = goal.id;
    const isCurrentlyComplete = completionStates[goalId];

    try {
      setUpdating(prev => ({ ...prev, [goalId]: true }));

      if (goal.type === 'habit') {
        // For habits, create or delete entry based on current state
        if (!isCurrentlyComplete) {
          // Create entry when checking
          const result = await createGoalEntry(user.uid, goalId, {
            occurred_at: new Date().toISOString(),
            quantity: null,
          });
          // Update the goal in context with the returned goal data
          if (result.goal) {
            await updateGoal(goalId, result.goal);
          }
        } else {
          // Delete today's entry when unchecking
          const todayBoundaries = getTodayBoundaries();
          const entries = await getGoalEntries(user.uid, goalId, todayBoundaries.start, todayBoundaries.end);
          if (entries && entries.length > 0) {
            // Delete the most recent entry for today
            const mostRecentEntry = entries.sort((a, b) => 
              new Date(b.occurred_at || b.occurredAt) - new Date(a.occurred_at || a.occurredAt)
            )[0];
            if (mostRecentEntry) {
              const updatedGoal = await deleteGoalEntry(user.uid, goalId, mostRecentEntry.id);
              // Update the goal in context with the returned goal data
              if (updatedGoal) {
                await updateGoal(goalId, updatedGoal);
              }
            }
          }
        }
      } else if (goal.type === 'metric') {
        // For metrics, open quantity dialog when checking, or delete entry when unchecking
        if (!isCurrentlyComplete) {
          setQuantityDialog({ open: true, goal: goal });
          setUpdating(prev => ({ ...prev, [goalId]: false }));
          return;
        } else {
          // Delete today's most recent entry when unchecking
          const todayBoundaries = getTodayBoundaries();
          const entries = await getGoalEntries(user.uid, goalId, todayBoundaries.start, todayBoundaries.end);
          if (entries && entries.length > 0) {
            // Delete the most recent entry for today
            const mostRecentEntry = entries.sort((a, b) => 
              new Date(b.occurred_at || b.occurredAt) - new Date(a.occurred_at || a.occurredAt)
            )[0];
            if (mostRecentEntry) {
              const updatedGoal = await deleteGoalEntry(user.uid, goalId, mostRecentEntry.id);
              // Update the goal in context with the returned goal data
              if (updatedGoal) {
                await updateGoal(goalId, updatedGoal);
              }
            }
          }
        }
      } else if (normalizeGoalType(goal.type) === 'one_time') {
        // Toggle completion status for one-time goals
        const newCompleted = !isCurrentlyComplete;
        await updateGoal(goalId, {
          completed: newCompleted,
          completedAt: newCompleted ? new Date().toISOString() : null,
        });
        // Update completion state locally (no API call needed - completion status is in goal object)
        setCompletionStates(prev => ({ ...prev, [goalId]: newCompleted }));
        setUpdating(prev => ({ ...prev, [goalId]: false }));
        return;
      } else if (goal.type === 'milestone') {
        // For milestones, toggle the next incomplete milestone or undo the last completed one
        const milestones = goal.milestones || goal.Milestones || [];
        const incompleteMilestone = milestones.find(m => !m.done);
        
        if (incompleteMilestone) {
          // Mark the next incomplete milestone as done
          // Get the milestone ID, handling both id and ID field names
          const milestoneId = incompleteMilestone.id || incompleteMilestone.ID;
          if (!milestoneId) {
            console.error('Milestone ID not found for milestone:', incompleteMilestone);
            setUpdating(prev => ({ ...prev, [goalId]: false }));
            return;
          }
          
          // Ensure milestoneId is a number (backend expects integer)
          const milestoneIdNum = typeof milestoneId === 'string' ? parseInt(milestoneId, 10) : milestoneId;
          await updateMilestone(user.uid, goalId, milestoneIdNum, { done: true });
          // Update goal in context to reflect milestone change
          const updatedMilestones = milestones.map(m => {
            const mId = m.id || m.ID;
            const mIdNum = typeof mId === 'string' ? parseInt(mId, 10) : mId;
            if (mIdNum === milestoneIdNum) {
              return { ...m, done: true, doneAt: new Date().toISOString() };
            }
            return m;
          });
          await updateGoal(goalId, { milestones: updatedMilestones });
          
          // Update completion state locally (check if all milestones are now done)
          const allDone = updatedMilestones.length > 0 && updatedMilestones.every(m => m.done);
          setCompletionStates(prev => ({ ...prev, [goalId]: allDone }));
        } else if (isCurrentlyComplete) {
          // If all are done and user unchecks, undo the last completed milestone from today
          const todayBoundaries = getTodayBoundaries();
          const todayStart = todayBoundaries.start;
          const todayEnd = todayBoundaries.end;
          
          // Find the most recently completed milestone that was done today
          const completedToday = milestones
            .filter(m => {
              const doneAt = m.doneAt || m.done_at;
              if (!doneAt) return false;
              const doneDate = new Date(doneAt);
              return doneDate >= todayStart && doneDate < todayEnd;
            })
            .sort((a, b) => {
              const aDate = new Date(a.doneAt || a.done_at);
              const bDate = new Date(b.doneAt || b.done_at);
              return bDate - aDate;
            });
          
          if (completedToday.length > 0) {
            const milestoneToUndo = completedToday[0];
            // Get the milestone ID, handling both id and ID field names
            const milestoneId = milestoneToUndo.id || milestoneToUndo.ID;
            if (!milestoneId) {
              console.error('Milestone ID not found for milestone:', milestoneToUndo);
              setUpdating(prev => ({ ...prev, [goalId]: false }));
              return;
            }
            
            // Ensure milestoneId is a number (backend expects integer)
            const milestoneIdNum = typeof milestoneId === 'string' ? parseInt(milestoneId, 10) : milestoneId;
            await updateMilestone(user.uid, goalId, milestoneIdNum, { done: false });
            // Update goal in context
            const updatedMilestones = milestones.map(m => {
              const mId = m.id || m.ID;
              const mIdNum = typeof mId === 'string' ? parseInt(mId, 10) : mId;
              if (mIdNum === milestoneIdNum) {
                return { ...m, done: false, doneAt: null };
              }
              return m;
            });
            await updateGoal(goalId, { milestones: updatedMilestones });
            
            // Update completion state
            const allDone = updatedMilestones.length > 0 && updatedMilestones.every(m => m.done);
            setCompletionStates(prev => ({ ...prev, [goalId]: allDone }));
          }
        }
        setUpdating(prev => ({ ...prev, [goalId]: false }));
        return;
      }

      // For habit/metric goals, fetch completion data only for this specific goal
      if (goal.type === 'habit' || goal.type === 'metric') {
        const updatedGoal = allGoals.find(g => g.id === goalId) || goal;
        if (filteredGoals.find(g => g.id === goalId)) {
          await fetchCompletions([updatedGoal]);
        }
        
        // Notify Goals component to refetch entries if this goal is expanded
        window.dispatchEvent(new CustomEvent('goalEntryChanged', { 
          detail: { goalId, goalType: goal.type } 
        }));
      }
    } catch (err) {
      setError('Failed to update goal');
    } finally {
      setUpdating(prev => ({ ...prev, [goalId]: false }));
    }
  };

  const handleQuantitySubmit = async () => {
    if (!user || !quantityDialog.goal) return;

    const goal = quantityDialog.goal;
    const quantity = parseFloat(quantityDialog.quantity || 0);

    if (quantity <= 0) {
      setError('Quantity must be greater than 0');
      return;
    }

    try {
      setUpdating(prev => ({ ...prev, [goal.id]: true }));
      setQuantityDialog({ open: false, goal: null, quantity: '' });

      const result = await createGoalEntry(user.uid, goal.id, {
        occurred_at: new Date().toISOString(),
        quantity: quantity,
      });

      // Update the goal in context with the returned goal data
      if (result.goal) {
        await updateGoal(goal.id, result.goal);
      }

      // Refresh completion states for this specific metric goal only
      const updatedGoal = result.goal || allGoals.find(g => g.id === goal.id) || goal;
      if (filteredGoals.find(g => g.id === goal.id)) {
        await fetchCompletions([updatedGoal]);
      }
      
      // Notify Goals component to refetch entries if this goal is expanded
      window.dispatchEvent(new CustomEvent('goalEntryChanged', { 
        detail: { goalId: goal.id, goalType: goal.type } 
      }));
    } catch (err) {
      setError('Failed to create entry');
    } finally {
      setUpdating(prev => ({ ...prev, [goal.id]: false }));
    }
  };

  const getGoalDisplayText = (goal) => {
    if (goal.type === 'milestone') {
      const display = formatMilestoneDisplay(goal);
      // Return the next incomplete milestone text (last item)
      return display.length > 0 ? display[display.length - 1].text : goal.title;
    }
    return goal.title;
  };

  const getGoalDisplayItems = (goal) => {
    if (goal.type === 'milestone') {
      return formatMilestoneDisplay(goal);
    }
    return [{ text: goal.title, completed: completionStates[goal.id] || false }];
  };


  if (loading) {
    return (
      <Card sx={{ overflow: 'visible' }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 2 }}>
            <CircularProgress size={24} />
            <Typography variant="body2" sx={{ ml: 2 }}>
              Loading goals...
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card sx={{ overflow: 'visible' }}>
        <CardContent>
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (filteredGoals.length === 0) {
    return (
      <Card sx={{ overflow: 'visible' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Today's Goals
          </Typography>
          <Typography variant="body2" color="text.secondary">
            No goals need attention right now. Great job! 🎉
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card sx={{ overflow: 'visible' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Today's Goals
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Track your progress for today
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {filteredGoals.map((goal, index) => {
              const isComplete = completionStates[goal.id] || false;
              const isUpdating = updating[goal.id] || false;
              const progress = progressData[goal.id];
              const displayItems = getGoalDisplayItems(goal);
              const progressText = goal.type === 'metric' && progress ? getProgressText(goal, progress) : '';
              
              // For milestones, show completed ones first (no checkbox), then next incomplete (with checkbox)
              // For other goals, show single item with checkbox
              if (goal.type === 'milestone') {
                return (
                  <Box key={goal.id}>
                    {displayItems.map((item, itemIndex) => {
                      const itemComplete = item.completed || false;
                      const isLastItem = itemIndex === displayItems.length - 1;
                      const isNextIncomplete = isLastItem && !itemComplete;
                      
                      const labelContent = (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              textDecoration: itemComplete ? 'line-through' : 'none',
                              opacity: itemComplete ? 0.6 : 1,
                              flex: 1,
                              ml: itemComplete ? 4 : 0, // Indent completed items
                            }}
                          >
                            {item.text}
                          </Typography>
                          {isNextIncomplete && (
                            <>
                              <Chip
                                label={getGoalTypeLabel(goal)}
                                color={getGoalTypeColor(goal.type)}
                                size="small"
                                variant="outlined"
                              />
                              {isUpdating && <CircularProgress size={16} />}
                            </>
                          )}
                        </Box>
                      );
                      
                      // Use FormControlLabel only when there's a checkbox, otherwise use Box
                      if (isNextIncomplete) {
                        return (
                          <FormControlLabel
                            key={itemIndex}
                            control={
                              <Checkbox
                                checked={false}
                                onChange={() => handleGoalToggle(goal)}
                                disabled={isUpdating}
                                color="primary"
                              />
                            }
                            label={labelContent}
                            sx={{ width: '100%', m: 0 }}
                          />
                        );
                      } else {
                        return (
                          <Box key={itemIndex} sx={{ display: 'flex', alignItems: 'center', width: '100%', m: 0 }}>
                            {labelContent}
                          </Box>
                        );
                      }
                    })}
                    {index < filteredGoals.length - 1 && <Divider sx={{ my: 0.5 }} />}
                  </Box>
                );
              }
              
              // For non-milestone goals, show single item
              return (
                <Box key={goal.id}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={isComplete}
                        onChange={() => handleGoalToggle(goal)}
                        disabled={isUpdating}
                        color="primary"
                      />
                    }
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            textDecoration: isComplete ? 'line-through' : 'none',
                            opacity: isComplete ? 0.6 : 1,
                            flex: 1
                          }}
                        >
                          {getGoalDisplayText(goal)}
                          {progressText && (
                            <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                              ({progressText})
                            </Typography>
                          )}
                        </Typography>
                        <Chip
                          label={getGoalTypeLabel(goal)}
                          color={getGoalTypeColor(goal.type)}
                          size="small"
                          variant="outlined"
                        />
                        {isUpdating && <CircularProgress size={16} />}
                      </Box>
                    }
                    sx={{ width: '100%', m: 0 }}
                  />
                  {index < filteredGoals.length - 1 && <Divider sx={{ my: 0.5 }} />}
                </Box>
              );
            })}
          </Box>
        </CardContent>
      </Card>

      {/* Quantity Input Dialog for Metrics */}
      <Dialog open={quantityDialog.open} onClose={() => setQuantityDialog({ open: false, goal: null, quantity: '' })}>
        <DialogTitle>Add {quantityDialog.goal?.title}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label={`Quantity (${quantityDialog.goal?.unit || 'units'})`}
            type="number"
            fullWidth
            variant="standard"
            value={quantityDialog.quantity || ''}
            onChange={(e) => setQuantityDialog(prev => ({ ...prev, quantity: e.target.value }))}
            inputProps={{ step: '0.1', min: 0 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQuantityDialog({ open: false, goal: null, quantity: '' })}>Cancel</Button>
          <Button onClick={handleQuantitySubmit} variant="contained">Add</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default QuickGoalCompletion;
