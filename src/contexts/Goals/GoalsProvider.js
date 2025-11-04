import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../AuthContext';
import { getGoals, addGoal, updateGoal, deleteGoal } from '../../services/dataService';
import { normalizeGoalType } from '../../utils/goalHelpers';
import GoalsContext from './GoalsContext';

// Helper function to normalize goal data
const normalizeGoal = (goalData, docId = null) => {
  // Ensure milestones array is properly set and is always an array
  if (!goalData.milestones && goalData.Milestones) {
    goalData.milestones = goalData.Milestones;
  }
  if (!goalData.milestones) {
    goalData.milestones = [];
  }
  // Ensure milestones have required properties
  if (Array.isArray(goalData.milestones)) {
    goalData.milestones = goalData.milestones.map(m => ({
      ...m,
      id: m.id || m.ID,
      done: m.done || false,
      title: m.title || 'Untitled milestone'
    }));
  }
  // Normalize goal type
  goalData.type = normalizeGoalType(goalData.type);
  return {
    id: docId || goalData.id,
    ...goalData
  };
};

const GoalsProvider = ({ children }) => {
  const { user } = useAuth();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch goals from API
  const refreshGoals = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      const snapshot = await getGoals(user.uid);
      const goalsData = snapshot.docs.map(doc => normalizeGoal(doc.data(), doc.id));
      setGoals(goalsData);
    } catch (err) {
      setError('Failed to fetch goals');
      console.error('Error fetching goals:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Initial load
  useEffect(() => {
    refreshGoals();
  }, [refreshGoals]);

  // Add a new goal
  const handleAddGoal = useCallback(async (goalData) => {
    if (!user) return;

    try {
      // Make API call
      const result = await addGoal(user.uid, goalData);
      
      // Optimistically add to state (normalize the goal data)
      const newGoal = normalizeGoal({ ...goalData, id: result.id }, result.id);
      setGoals(prev => [...prev, newGoal]);
      
      return newGoal;
    } catch (err) {
      setError('Failed to create goal');
      console.error('Error creating goal:', err);
      throw err;
    }
  }, [user]);

  // Update an existing goal
  const handleUpdateGoal = useCallback(async (goalId, updates) => {
    if (!user) return;

    try {
      // Make API call
      await updateGoal(user.uid, goalId, updates);
      
      // Optimistically update state
      setGoals(prev => prev.map(goal => {
        if (goal.id === goalId) {
          return normalizeGoal({ ...goal, ...updates }, goalId);
        }
        return goal;
      }));
    } catch (err) {
      setError('Failed to update goal');
      console.error('Error updating goal:', err);
      // Revert on error by refreshing
      refreshGoals();
      throw err;
    }
  }, [user, refreshGoals]);

  // Delete a goal
  const handleDeleteGoal = useCallback(async (goalId) => {
    if (!user) return;
    
    try {
      // Make API call
      await deleteGoal(user.uid, goalId);
      
      // Optimistically remove from state
      setGoals(prev => prev.filter(goal => goal.id !== goalId));
    } catch (err) {
      setError('Failed to delete goal');
      console.error('Error deleting goal:', err);
      // Revert on error by refreshing
      refreshGoals();
      throw err;
    }
  }, [user, refreshGoals]);

  return (
    <GoalsContext.Provider
      value={{
        goals,
        loading,
        error,
        addGoal: handleAddGoal,
        updateGoal: handleUpdateGoal,
        deleteGoal: handleDeleteGoal,
        refreshGoals,
      }}
    >
      {children}
    </GoalsContext.Provider>
  );
};

export const useGoalsContext = () => {
  const context = React.useContext(GoalsContext);
  if (!context) {
    throw new Error('useGoalsContext must be used within a GoalsProvider');
  }
  return context;
};

export default GoalsProvider;
