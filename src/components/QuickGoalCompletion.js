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
} from '@mui/material';
import { useAuth } from '../AuthContext';
import { getGoals } from '../services/dataService';
import {
  createGoalEntry,
  getGoalProgress,
  markMilestoneComplete,
  markOneTimeGoalComplete,
  updateMilestone,
} from '../services/dataService';
import {
  filterGoalsForQuickCompletion,
  sortGoalsByPriority,
  isTodayOrOverdue,
} from '../utils/goalHelpers';

const QuickGoalCompletion = ({ onGoalUpdate }) => {
  const { user } = useAuth();
  const [goals, setGoals] = useState([]);
  const [completionStates, setCompletionStates] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updating, setUpdating] = useState({});

  const fetchGoalsAndCompletions = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      
      // Fetch all goals
      const snapshot = await getGoals(user.uid);
      const allGoals = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // Filter and sort goals for quick completion
      const filteredGoals = filterGoalsForQuickCompletion(allGoals);
      const sortedGoals = sortGoalsByPriority(filteredGoals);
      const topGoals = sortedGoals.slice(0, 5); // Limit to top 5

      setGoals(topGoals);

      // Check completion states for each goal
      const completionStates = {};
      for (const goal of topGoals) {
        if (goal.type === 'habit' || goal.type === 'metric') {
          // Get progress for habit/metric goals
          try {
            const progress = await getGoalProgress(user.uid, goal.id);
            completionStates[goal.id] = progress.completed || false;
          } catch (err) {
            completionStates[goal.id] = false;
          }
        } else if (goal.type === 'one_time') {
          completionStates[goal.id] = goal.completed || false;
        } else if (goal.type === 'milestone') {
          // For milestones, check if all are done
          const allDone = goal.milestones?.length > 0 && goal.milestones.every(m => m.done);
          completionStates[goal.id] = allDone || false;
        }
      }

      setCompletionStates(completionStates);
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
        // Users can manage entries separately if needed
      } else if (goal.type === 'metric') {
        // For metrics, prompt for quantity (for now, create with 0 and let user edit)
        // TODO: Add a prompt dialog for quantity input
        if (!isCurrentlyComplete) {
          await createGoalEntry(user.uid, goalId, {
            occurred_at: new Date().toISOString(),
            quantity: 0,
          });
        }
      } else if (goal.type === 'one_time') {
        if (!isCurrentlyComplete) {
          await markOneTimeGoalComplete(user.uid, goalId);
        }
      } else if (goal.type === 'milestone') {
        // For milestones, mark the first incomplete milestone as done
        const incompleteMilestone = goal.milestones?.find(m => !m.done);
        if (incompleteMilestone) {
          await updateMilestone(user.uid, goalId, incompleteMilestone.id, { done: true });
          
          // Update local state
          setGoals(prevGoals => prevGoals.map(g => {
            if (g.id === goalId) {
              const updatedMilestones = g.milestones.map(m => 
                m.id === incompleteMilestone.id ? { ...m, done: true, doneAt: new Date() } : m
              );
              return { ...g, milestones: updatedMilestones };
            }
            return g;
          }));
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

  const getGoalDisplayText = (goal) => {
    if (goal.type === 'milestone') {
      // Find the next incomplete milestone
      const nextMilestone = goal.milestones?.find(m => !m.done);
      return nextMilestone ? `${goal.title}: ${nextMilestone.title}` : goal.title;
    }
    return goal.title;
  };

  const getGoalTypeLabel = (goal) => {
    switch (goal.type) {
      case 'habit': 
        return goal.cadence ? `${goal.cadence.charAt(0).toUpperCase() + goal.cadence.slice(1)} Habit` : 'Habit';
      case 'metric': 
        return goal.cadence ? `${goal.cadence.charAt(0).toUpperCase() + goal.cadence.slice(1)} Metric` : 'Metric';
      case 'one_time': return 'One-time';
      case 'milestone': return 'Milestone';
      default: return goal.type || 'Goal';
    }
  };

  const getGoalTypeColor = (goal) => {
    switch (goal.type) {
      case 'habit': return 'success';
      case 'metric': return 'warning';
      case 'one_time': return 'primary';
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
            Quick Goal Completion
          </Typography>
          <Typography variant="body2" color="text.secondary">
            No goals need attention right now. Great job! 🎉
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Quick Goal Completion
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Complete your most urgent goals for today
        </Typography>
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {goals.map((goal, index) => {
            const isComplete = completionStates[goal.id] || false;
            const isUpdating = updating[goal.id] || false;
            
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
  );
};

export default QuickGoalCompletion;
