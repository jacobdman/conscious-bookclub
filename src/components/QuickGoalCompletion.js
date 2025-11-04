import React, { useState, useEffect, useCallback } from 'react';
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
import { useAuth } from '../AuthContext';
import { getGoals, getGoalEntries, getGoalProgress, createGoalEntry, markOneTimeGoalComplete, updateMilestone } from '../services/dataService';
import {
  filterGoalsForQuickCompletion,
  sortGoalsByPriority,
  getTodayBoundaries,
  hasEntryToday,
  getProgressText,
  formatMilestoneDisplay,
  getPeriodBoundaries,
} from '../utils/goalHelpers';

const TodaysGoals = ({ onGoalUpdate }) => {
  const { user } = useAuth();
  const [goals, setGoals] = useState([]);
  const [completionStates, setCompletionStates] = useState({});
  const [progressData, setProgressData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState({});
  const [quantityDialog, setQuantityDialog] = useState({ open: false, goal: null });

  const fetchGoalsAndCompletions = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      
      // Fetch all goals
      const snapshot = await getGoals(user.uid);
      const allGoals = snapshot.docs.map(doc => {
        const goalData = doc.data();
        // Ensure milestones array is properly set (handle Sequelize capitalization)
        if (!goalData.milestones && goalData.Milestones) {
          goalData.milestones = goalData.Milestones;
        }
        // Normalize goal type (handle any variations)
        if (goalData.type === 'one-time') {
          goalData.type = 'one_time';
        }
        return {
          id: doc.id,
          ...goalData
        };
      });

      // Filter and sort goals for quick completion
      const filteredGoals = filterGoalsForQuickCompletion(allGoals);
      const sortedGoals = sortGoalsByPriority(filteredGoals);
      const topGoals = sortedGoals.slice(0, 5); // Limit to top 5

      setGoals(topGoals);

      // Check completion states and fetch data for each goal
      const completionStates = {};
      const progressData = {};
      const todayBoundaries = getTodayBoundaries();

      for (const goal of topGoals) {
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
          // For metrics: check if entry exists TODAY (like habits), also get progress for display
          try {
            const entries = await getGoalEntries(user.uid, goal.id, todayBoundaries.start, todayBoundaries.end);
            const hasToday = hasEntryToday(entries);
            completionStates[goal.id] = hasToday;
            
            // Also fetch period progress for display
            const progress = await getGoalProgress(user.uid, goal.id);
            progressData[goal.id] = progress;
          } catch (err) {
            completionStates[goal.id] = false;
            progressData[goal.id] = null;
          }
        } else if (goal.type === 'one_time' || goal.type === 'one-time') {
          completionStates[goal.id] = goal.completed || false;
        } else if (goal.type === 'milestone') {
          // For milestones: check if all are done
          const milestones = goal.milestones || goal.Milestones || [];
          const allDone = milestones.length > 0 && milestones.every(m => m.done);
          completionStates[goal.id] = allDone || false;
        }
      }

      setCompletionStates(completionStates);
      setProgressData(progressData);
    } catch (err) {
      setError('Failed to fetch goals');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchGoalsAndCompletions();
  }, [user, fetchGoalsAndCompletions]);

  const handleGoalToggle = async (goal) => {
    if (!user) return;

    const goalId = goal.id;
    const isCurrentlyComplete = completionStates[goalId];

    try {
      setUpdating(prev => ({ ...prev, [goalId]: true }));

      if (goal.type === 'habit') {
        // For habits, create an entry when toggling to complete
        if (!isCurrentlyComplete) {
          await createGoalEntry(user.uid, goalId, {
            occurred_at: new Date().toISOString(),
            quantity: null,
          });
        }
        // Note: We don't handle "uncompleting" by deleting entries here
      } else if (goal.type === 'metric') {
        // For metrics, open quantity dialog
        if (!isCurrentlyComplete) {
          setQuantityDialog({ open: true, goal: goal });
          setUpdating(prev => ({ ...prev, [goalId]: false }));
          return;
        }
      } else if (goal.type === 'one_time' || goal.type === 'one-time') {
        if (!isCurrentlyComplete) {
          await markOneTimeGoalComplete(user.uid, goalId);
        }
      } else if (goal.type === 'milestone') {
        // For milestones, mark the next incomplete milestone as done
        const milestones = goal.milestones || goal.Milestones || [];
        const incompleteMilestone = milestones.find(m => !m.done);
        if (incompleteMilestone) {
          await updateMilestone(user.uid, goalId, incompleteMilestone.id, { done: true });
        }
      }

      // Refresh to get updated progress
      await fetchGoalsAndCompletions();
      
      // Notify parent component if callback provided
      if (onGoalUpdate) {
        onGoalUpdate();
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

      await createGoalEntry(user.uid, goal.id, {
        occurred_at: new Date().toISOString(),
        quantity: quantity,
      });

      // Refresh to get updated progress
      await fetchGoalsAndCompletions();
      
      // Notify parent component if callback provided
      if (onGoalUpdate) {
        onGoalUpdate();
      }
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

  const getGoalTypeLabel = (goal) => {
    switch (goal.type) {
      case 'habit': 
        return goal.cadence ? `${goal.cadence.charAt(0).toUpperCase() + goal.cadence.slice(1)} Habit` : 'Habit';
      case 'metric': 
        return goal.cadence ? `${goal.cadence.charAt(0).toUpperCase() + goal.cadence.slice(1)} Metric` : 'Metric';
      case 'one_time':
      case 'one-time':
        return 'One-time';
      case 'milestone': return 'Milestone';
      default: return goal.type || 'Goal';
    }
  };

  const getGoalTypeColor = (goal) => {
    switch (goal.type) {
      case 'habit': return 'success';
      case 'metric': return 'warning';
      case 'one_time':
      case 'one-time':
        return 'primary';
      case 'milestone': return 'secondary';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Card>
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
      <Card>
        <CardContent>
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (goals.length === 0) {
    return (
      <Card>
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
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Today's Goals
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Track your progress for today
          </Typography>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {goals.map((goal, index) => {
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
                      
                      return (
                        <FormControlLabel
                          key={itemIndex}
                          control={
                            isNextIncomplete ? (
                              <Checkbox
                                checked={false}
                                onChange={() => handleGoalToggle(goal)}
                                disabled={isUpdating}
                                color="primary"
                              />
                            ) : null
                          }
                          label={
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
                                    color={getGoalTypeColor(goal)}
                                    size="small"
                                    variant="outlined"
                                  />
                                  {isUpdating && <CircularProgress size={16} />}
                                </>
                              )}
                            </Box>
                          }
                          sx={{ width: '100%', m: 0 }}
                        />
                      );
                    })}
                    {index < goals.length - 1 && <Divider sx={{ my: 0.5 }} />}
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
                          color={getGoalTypeColor(goal)}
                          size="small"
                          variant="outlined"
                        />
                        {isUpdating && <CircularProgress size={16} />}
                      </Box>
                    }
                    sx={{ width: '100%', m: 0 }}
                  />
                  {index < goals.length - 1 && <Divider sx={{ my: 0.5 }} />}
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

export default TodaysGoals;
