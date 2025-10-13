import React, { useState, useEffect } from 'react';
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
import { getGoals } from '../services/firestoreService';
import {
  checkGoalCompletion,
  markGoalComplete,
  markGoalIncomplete,
  markMilestoneComplete,
  markOneTimeGoalComplete,
} from '../services/firestoreService';
import {
  getCurrentPeriodId,
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

  const fetchGoalsAndCompletions = async () => {
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
        const periodId = getCurrentPeriodId(goal.trackingType);
        
        if (goal.trackingType === 'daily' || goal.trackingType === 'weekly') {
          if (periodId) {
            completionStates[goal.id] = await checkGoalCompletion(user.uid, goal.id, periodId);
          }
        } else if (goal.trackingType === 'one-time') {
          completionStates[goal.id] = goal.completed || false;
        } else if (goal.trackingType === 'milestones') {
          // For milestones, check if the next overdue milestone is incomplete
          const nextOverdueMilestone = goal.milestones?.find(milestone => 
            !milestone.completed && isTodayOrOverdue(milestone.dueDate)
          );
          completionStates[goal.id] = !nextOverdueMilestone;
        }
      }

      setCompletionStates(completionStates);
    } catch (err) {
      setError('Failed to fetch goals');
      console.error('Error fetching goals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoalsAndCompletions();
  }, [user]);

  const handleGoalToggle = async (goal) => {
    if (!user) return;

    const goalId = goal.id;
    const isCurrentlyComplete = completionStates[goalId];
    const periodId = getCurrentPeriodId(goal.trackingType);

    try {
      setUpdating(prev => ({ ...prev, [goalId]: true }));

      if (goal.trackingType === 'daily' || goal.trackingType === 'weekly') {
        if (isCurrentlyComplete) {
          await markGoalIncomplete(user.uid, goalId, periodId);
        } else {
          await markGoalComplete(user.uid, goalId, periodId);
        }
      } else if (goal.trackingType === 'one-time') {
        if (!isCurrentlyComplete) {
          await markOneTimeGoalComplete(user.uid, goalId);
        }
      } else if (goal.trackingType === 'milestones') {
        // For milestones, complete the first overdue milestone
        const overdueMilestoneIndex = goal.milestones?.findIndex(milestone => 
          !milestone.completed && isTodayOrOverdue(milestone.dueDate)
        );
        
        if (overdueMilestoneIndex !== -1) {
          await markMilestoneComplete(user.uid, goalId, overdueMilestoneIndex);
          
          // Update local state to mark milestone as complete
          setGoals(prevGoals => prevGoals.map(g => {
            if (g.id === goalId) {
              const updatedMilestones = [...g.milestones];
              updatedMilestones[overdueMilestoneIndex] = {
                ...updatedMilestones[overdueMilestoneIndex],
                completed: true,
                completedAt: new Date()
              };
              return { ...g, milestones: updatedMilestones };
            }
            return g;
          }));
        }
      }

      // Update local state
      setCompletionStates(prev => ({
        ...prev,
        [goalId]: !isCurrentlyComplete
      }));

      // For milestone goals, we've already updated local state above
      // For other goals, refresh to get updated data
      if (goal.trackingType !== 'milestones') {
        await fetchGoalsAndCompletions();
      }
      
      // Notify parent component if callback provided
      if (onGoalUpdate) {
        onGoalUpdate();
      }
    } catch (err) {
      setError('Failed to update goal');
      console.error('Error updating goal:', err);
    } finally {
      setUpdating(prev => ({ ...prev, [goalId]: false }));
    }
  };

  const getGoalDisplayText = (goal) => {
    switch (goal.trackingType) {
      case 'daily':
        return goal.title;
      case 'weekly':
        return goal.title;
      case 'one-time':
        return goal.title;
      case 'milestones':
        // Find the next incomplete milestone due today or overdue
        const nextMilestone = goal.milestones?.find(milestone => 
          !milestone.completed && isTodayOrOverdue(milestone.dueDate)
        );
        return nextMilestone ? `${goal.title}: ${nextMilestone.title}` : goal.title;
      default:
        return goal.title;
    }
  };

  const getGoalTypeLabel = (goal) => {
    switch (goal.trackingType) {
      case 'daily': return 'Daily';
      case 'weekly': return 'Weekly';
      case 'one-time': return 'One-time';
      case 'milestones': return 'Milestone';
      default: return goal.trackingType;
    }
  };

  const getGoalTypeColor = (goal) => {
    switch (goal.trackingType) {
      case 'daily': return 'success';
      case 'weekly': return 'warning';
      case 'one-time': return 'primary';
      case 'milestones': return 'secondary';
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
