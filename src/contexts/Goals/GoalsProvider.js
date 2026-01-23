import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from 'AuthContext';
import useClubContext from 'contexts/Club';
import { 
  getGoals, 
  addGoal, 
  updateGoal, 
  deleteGoal,
  createGoalEntry,
  updateGoalEntry,
  deleteGoalEntry,
  getGoalEntries,
  getGoalProgress,
  createMilestone,
  deleteMilestone,
  updateMilestone,
} from 'services/goals/goals.service';
import { normalizeGoalType } from 'utils/goalHelpers';
import GoalsContext from './GoalsContext';

// Helper function to normalize goal data
const normalizeGoal = (goalData, docId = null, preserveEntries = false) => {
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
      title: m.title || 'Untitled milestone',
      order: m.order !== undefined ? m.order : (m.id || m.ID || 0)
    }));
  }
  // Normalize goal type
  goalData.type = normalizeGoalType(goalData.type);
  
  const normalized = {
    id: docId || goalData.id,
    ...goalData
  };
  
  // Preserve entries and pagination if they exist and preserveEntries is true
  // This allows us to keep cached entries when updating goals
  if (!preserveEntries) {
    // Initialize entries and pagination if not present
    if (!normalized.entries) {
      normalized.entries = [];
    }
    if (!normalized.entriesPagination) {
      normalized.entriesPagination = {
        hasMore: true,
        offset: 0,
        limit: 10
      };
    }
  }
  
  return normalized;
};

// ******************STATE VALUES**********************
const GoalsProvider = ({ children }) => {
  const { user } = useAuth();
  const { currentClub } = useClubContext();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const goalEntriesCacheRef = useRef({});

  // ******************LOAD FUNCTIONS**********************
  // Fetch goals from API
  const refreshGoals = useCallback(async (options = {}) => {
    if (!user || !currentClub) return;

    try {
      setLoading(true);
      setError(null);
      const goals = await getGoals(user.uid, currentClub.id, options);
      const goalsData = goals.map(goal => {
        const normalized = normalizeGoal(goal, goal.id);
        // Goals now include today's entries from API for habit/metric goals
        // Initialize entriesPagination if entries are present
        if (normalized.entries && normalized.entries.length > 0 && !normalized.entriesPagination) {
          normalized.entriesPagination = {
            hasMore: false, // Today's entries are a limited set
            offset: normalized.entries.length,
            limit: 10
          };
        }
        return normalized;
      });
      setGoals(goalsData);
    } catch (err) {
      setError('Failed to fetch goals');
      console.error('Error fetching goals:', err);
    } finally {
      setLoading(false);
    }
  }, [user, currentClub]);

  // ******************EFFECTS/REACTIONS**********************
  // Initial load
  useEffect(() => {
    refreshGoals();
  }, [refreshGoals]);

  // ******************SETTERS**********************
  // Add a new goal
  const handleAddGoal = useCallback(async (goalData) => {
    if (!user || !currentClub) return;

    try {
      // Make API call - returns full goal object with id, created_at, etc.
      const result = await addGoal(user.uid, currentClub.id, goalData);
      
      // Normalize and add to state directly from API response
      const newGoal = normalizeGoal(result, result.id);
      setGoals(prev => [...prev, newGoal]);
      
      return newGoal;
    } catch (err) {
      setError('Failed to create goal');
      console.error('Error creating goal:', err);
      throw err;
    }
  }, [user, currentClub]);

  // Update an existing goal
  const handleUpdateGoal = useCallback(async (goalId, updates) => {
    if (!user || !currentClub) return;

    try {
      // Make API call - returns full updated goal object with progress
      const result = await updateGoal(user.uid, currentClub.id, goalId, updates);
      
      // Preserve entries and pagination when updating (they're cached separately)
      let updatedGoalResult = null;
      setGoals(prev => prev.map(goal => {
        if (goal.id === goalId) {
          const updatedGoal = normalizeGoal(result, result.id, true);
          // Preserve cached entries and pagination if they exist
          updatedGoalResult = {
            ...updatedGoal,
            entries: goal.entries || updatedGoal.entries || [],
            entriesPagination: goal.entriesPagination || updatedGoal.entriesPagination || {
              hasMore: true,
              offset: 0,
              limit: 10
            }
          };
          return updatedGoalResult;
        }
        return goal;
      }));
      
      return updatedGoalResult || normalizeGoal(result, result.id);
    } catch (err) {
      setError('Failed to update goal');
      console.error('Error updating goal:', err);
      throw err;
    }
  }, [user, currentClub]);

  // Delete a goal
  const handleDeleteGoal = useCallback(async (goalId) => {
    if (!user || !currentClub) return;

    // Store the goal for potential revert and optimistically remove from state
    let deletedGoal = null;
    setGoals(prev => {
      deletedGoal = prev.find(g => g.id === goalId);
      return prev.filter(goal => goal.id !== goalId);
    });
    
    try {
      // Make API call
      await deleteGoal(user.uid, currentClub.id, goalId);
    } catch (err) {
      setError('Failed to delete goal');
      console.error('Error deleting goal:', err);
      // Revert optimistic update on error
      if (deletedGoal) {
        setGoals(prev => [...prev, deletedGoal]);
      }
      throw err;
    }
  }, [user, currentClub]);

  // ******************ENTRY OPERATIONS**********************
  const clearGoalEntriesCache = useCallback((goalId) => {
    if (!goalId || !goalEntriesCacheRef.current[goalId]) return;
    delete goalEntriesCacheRef.current[goalId];
  }, []);

  const handleFetchGoalEntriesForMonth = useCallback(async (goalId, monthDate) => {
    if (!user || !goalId || !monthDate) return [];

    const date = monthDate instanceof Date ? monthDate : new Date(monthDate);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const goalCache = goalEntriesCacheRef.current[goalId] || {};

    if (goalCache[monthKey]) {
      return goalCache[monthKey];
    }

    const periodStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const periodEnd = new Date(date.getFullYear(), date.getMonth() + 1, 1);

    const entries = await getGoalEntries(user.uid, goalId, periodStart, periodEnd);
    const sortedEntries = entries.sort((a, b) => {
      const dateA = new Date(a.occurred_at || a.occurredAt || 0);
      const dateB = new Date(b.occurred_at || b.occurredAt || 0);
      return dateB - dateA;
    });

    goalEntriesCacheRef.current[goalId] = {
      ...goalCache,
      [monthKey]: sortedEntries,
    };

    return sortedEntries;
  }, [user]);

  // Fetch entries for a goal (with pagination support)
  const handleFetchGoalEntries = useCallback(async (goalId, limit = 10, offset = 0, append = false, periodStart = null, periodEnd = null) => {
    if (!user || !goalId) return;

    try {
      const entries = await getGoalEntries(user.uid, goalId, periodStart, periodEnd, limit, offset);
      
      // Sort entries by occurred_at (descending - most recent first)
      const sortedEntries = entries.sort((a, b) => {
        const dateA = new Date(a.occurred_at || a.occurredAt || 0);
        const dateB = new Date(b.occurred_at || b.occurredAt || 0);
        return dateB - dateA;
      });

      setGoals(prev => prev.map(goal => {
        if (goal.id === goalId) {
          const existingEntries = goal.entries || [];
          const newEntries = append 
            ? [...existingEntries, ...sortedEntries].sort((a, b) => {
                const dateA = new Date(a.occurred_at || a.occurredAt || 0);
                const dateB = new Date(b.occurred_at || b.occurredAt || 0);
                return dateB - dateA;
              })
            : sortedEntries;
          
          return {
            ...goal,
            entries: newEntries,
            entriesPagination: {
              hasMore: entries.length === limit,
              offset: offset + entries.length,
              limit
            }
          };
        }
        return goal;
      }));

      return sortedEntries;
    } catch (err) {
      console.error('Error fetching entries:', err);
      throw err;
    }
  }, [user]);

  // Create a new entry
  const handleCreateEntry = useCallback(async (goalId, entryData) => {
    if (!user || !currentClub || !goalId) return;

    try {
      const result = await createGoalEntry(user.uid, goalId, entryData);
      // Service returns {entry: <entry object>, goal: null, ...entry properties}
      const savedEntry = result.entry || result;
      const updatedGoal = result.goal;

      // Normalize entry to ensure consistent date format
      // Sequelize returns occurredAt (camelCase), but we need both formats for compatibility
      const normalizedEntry = {
        id: savedEntry.id,
        goalId: savedEntry.goalId || savedEntry.goal_id,
        userId: savedEntry.userId || savedEntry.user_id,
        occurred_at: savedEntry.occurred_at || savedEntry.occurredAt,
        occurredAt: savedEntry.occurredAt || savedEntry.occurred_at,
        quantity: savedEntry.quantity,
        created_at: savedEntry.created_at || savedEntry.createdAt,
      };

      let updatedProgress = null;
      try {
        updatedProgress = await getGoalProgress(user.uid, goalId);
      } catch (progressError) {
        console.error('Error fetching goal progress:', progressError);
      }

      // Update goal in state with new entry added to entries array
      setGoals(prev => {
        const updatedGoals = prev.map(goal => {
          if (goal.id === goalId) {
            const existingEntries = goal.entries || [];
            // Ensure we don't add duplicates - check by id
            const entryExists = existingEntries.some(e => e.id === normalizedEntry.id);
            
            if (entryExists) {
              // Entry already exists, update it (shouldn't happen for new entries, but just in case)
              const newEntries = existingEntries.map(e => 
                e.id === normalizedEntry.id ? normalizedEntry : e
              );
              
              // Sort by date (most recent first)
              const sortedEntries = [...newEntries].sort((a, b) => {
                const dateA = new Date(a.occurred_at || a.occurredAt || 0);
                const dateB = new Date(b.occurred_at || b.occurredAt || 0);
                return dateB - dateA;
              });
              
              return {
                ...goal,
                entries: sortedEntries, // New array reference
                progress: updatedProgress || goal.progress,
                entriesPagination: {
                  ...(goal.entriesPagination || {
                    hasMore: true,
                    offset: 0,
                    limit: 10
                  })
                }
              };
            } else {
              // Add new entry at the beginning
              const newEntries = [normalizedEntry, ...existingEntries];
              
              // Sort by date (most recent first)
              const sortedEntries = [...newEntries].sort((a, b) => {
                const dateA = new Date(a.occurred_at || a.occurredAt || 0);
                const dateB = new Date(b.occurred_at || b.occurredAt || 0);
                return dateB - dateA;
              });
              
              // Create a completely new goal object to ensure React detects the change
              // This is critical for React to re-render
              const updatedGoalObj = {
                ...goal,
                entries: sortedEntries, // New array reference
                progress: updatedProgress || goal.progress,
                entriesPagination: {
                  ...(goal.entriesPagination || {
                    hasMore: true,
                    offset: 0,
                    limit: 10
                  })
                }
              };
              
              // If API returned updated goal, merge its properties
              if (updatedGoal) {
                const normalizedUpdatedGoal = normalizeGoal(updatedGoal, updatedGoal.id, true);
                return {
                  ...normalizedUpdatedGoal,
                  entries: sortedEntries, // Use the same sorted entries
                  progress: updatedProgress || normalizedUpdatedGoal.progress || goal.progress,
                  entriesPagination: updatedGoalObj.entriesPagination
                };
              }
              
              return updatedGoalObj;
            }
          }
          return goal; // Return unchanged goal (new reference not needed for other goals)
        });
        
        // Return new array to ensure React detects the change
        return updatedGoals;
      });

      clearGoalEntriesCache(goalId);
      return { entry: normalizedEntry, goal: updatedGoal };
    } catch (err) {
      console.error('Error creating entry:', err);
      throw err;
    }
  }, [user, currentClub]);

  // Update an existing entry
  const handleUpdateEntry = useCallback(async (goalId, entryId, updates) => {
    if (!user || !currentClub || !goalId || !entryId) return;

    try {
      const result = await updateGoalEntry(user.uid, goalId, entryId, updates);
      const savedEntry = result.entry || result;
      const updatedGoal = result.goal;

      // Update goal in state with entry updated in entries array
      setGoals(prev => prev.map(goal => {
        if (goal.id === goalId) {
          const existingEntries = goal.entries || [];
          const newEntries = existingEntries.map(e => 
            e.id === entryId ? { ...e, ...updates, ...savedEntry } : e
          ).sort((a, b) => {
            const dateA = new Date(a.occurred_at || a.occurredAt || 0);
            const dateB = new Date(b.occurred_at || b.occurredAt || 0);
            return dateB - dateA;
          });
          
          const normalizedGoal = updatedGoal
            ? normalizeGoal(updatedGoal, updatedGoal.id, true)
            : goal;

          return {
            ...normalizedGoal,
            entries: newEntries,
            entriesPagination: goal.entriesPagination || {
              hasMore: true,
              offset: 0,
              limit: 10
            }
          };
        }
        return goal;
      }));

      clearGoalEntriesCache(goalId);
      return { entry: savedEntry, goal: updatedGoal };
    } catch (err) {
      console.error('Error updating entry:', err);
      throw err;
    }
  }, [user, currentClub]);

  // Delete an entry
  const handleDeleteEntry = useCallback(async (goalId, entryId) => {
    if (!user || !currentClub || !goalId || !entryId) return;

    try {
      // DELETE endpoint returns 204 (no content), so we handle it optimistically
      await deleteGoalEntry(user.uid, goalId, entryId);

      let updatedProgress = null;
      try {
        updatedProgress = await getGoalProgress(user.uid, goalId);
      } catch (progressError) {
        console.error('Error fetching goal progress:', progressError);
      }

      // Update goal in state with entry removed from entries array
      let updatedGoalResult = null;
      setGoals(prev => prev.map(goal => {
        if (goal.id === goalId) {
          const existingEntries = goal.entries || [];
          const newEntries = existingEntries.filter(e => e.id !== entryId);
          
          // Preserve existing goal data, just update entries
          updatedGoalResult = {
            ...goal,
            entries: newEntries,
            progress: updatedProgress || goal.progress,
            entriesPagination: goal.entriesPagination || {
              hasMore: true,
              offset: 0,
              limit: 10
            }
          };
          return updatedGoalResult;
        }
        return goal;
      }));

      clearGoalEntriesCache(goalId);
      return updatedGoalResult;
    } catch (err) {
      console.error('Error deleting entry:', err);
      throw err;
    }
  }, [user, currentClub]);

  // ******************MILESTONE OPERATIONS**********************
  // Create a new milestone
  const handleCreateMilestone = useCallback(async (goalId, milestoneData) => {
    if (!user || !currentClub || !goalId) return;

    try {
      const result = await createMilestone(user.uid, goalId, milestoneData);

      let createdMilestone = result;
      // Some APIs might wrap the response
      if (result && result.id === undefined && result.milestone) {
        createdMilestone = result.milestone;
      }

      setGoals(prev => prev.map(goal => {
        if (goal.id === goalId) {
          const existingMilestones = goal.milestones || [];
          const combinedMilestones = [...existingMilestones, createdMilestone];
          const sortedMilestones = [...combinedMilestones].sort((a, b) => {
            const orderA = a.order !== undefined ? a.order : (a.id || 0);
            const orderB = b.order !== undefined ? b.order : (b.id || 0);
            return orderA - orderB;
          }).map((milestone, index) => ({
            ...milestone,
            order: index,
          }));

          const completedCount = sortedMilestones.filter(m => m.done).length;
          const progress = {
            completed: sortedMilestones.length > 0 && completedCount === sortedMilestones.length,
            actual: completedCount,
            target: sortedMilestones.length,
          };

          return {
            ...goal,
            milestones: sortedMilestones,
            progress,
          };
        }
        return goal;
      }));

      return createdMilestone;
    } catch (err) {
      console.error('Error creating milestone:', err);
      throw err;
    }
  }, [user, currentClub]);

  // Delete a milestone
  const handleDeleteMilestone = useCallback(async (goalId, milestoneId) => {
    if (!user || !currentClub || !goalId || !milestoneId) return;

    try {
      await deleteMilestone(user.uid, goalId, milestoneId);

      setGoals(prev => prev.map(goal => {
        if (goal.id === goalId) {
          const targetId = typeof milestoneId === 'string' ? parseInt(milestoneId, 10) : milestoneId;
          const remainingMilestones = (goal.milestones || []).filter(m => {
            const mId = m.id || m.ID;
            const normalizedId = typeof mId === 'string' ? parseInt(mId, 10) : mId;
            return normalizedId !== targetId;
          }).map((milestone, index) => ({
            ...milestone,
            order: index,
          }));

          const completedCount = remainingMilestones.filter(m => m.done).length;
          const progress = {
            completed: remainingMilestones.length > 0 && completedCount === remainingMilestones.length,
            actual: completedCount,
            target: remainingMilestones.length,
          };

          return {
            ...goal,
            milestones: remainingMilestones,
            progress,
          };
        }
        return goal;
      }));
    } catch (err) {
      console.error('Error deleting milestone:', err);
      throw err;
    }
  }, [user, currentClub]);

  // Update a single milestone
  const handleUpdateMilestone = useCallback(async (goalId, milestoneId, updates) => {
    if (!user || !currentClub || !goalId || !milestoneId) return;

    try {
      const updatedMilestone = await updateMilestone(user.uid, goalId, milestoneId, updates);
      
      // Update milestone in goal's milestones array and calculate progress locally
      let updatedGoalResult = null;
      setGoals(prev => prev.map(goal => {
        if (goal.id === goalId) {
          const updatedMilestones = (goal.milestones || []).map(m => {
            const mId = m.id || m.ID;
            const mIdNum = typeof mId === 'string' ? parseInt(mId, 10) : mId;
            const milestoneIdNum = typeof milestoneId === 'string' ? parseInt(milestoneId, 10) : milestoneId;
            
            if (mIdNum === milestoneIdNum) {
              // Use the updated milestone from API response directly
              // Backend handles doneAt clearing when done is false
              return {
                ...m,
                ...updatedMilestone,
                done: updatedMilestone.done || false,
                doneAt: updatedMilestone.doneAt || null
              };
            }
            return m;
          });
          
          // Calculate progress locally for milestone goals
          const allDone = updatedMilestones.length > 0 && updatedMilestones.every(m => m.done);
          const completedCount = updatedMilestones.filter(m => m.done).length;
          const progress = {
            completed: allDone,
            actual: completedCount,
            target: updatedMilestones.length
          };
          
          updatedGoalResult = {
            ...goal,
            milestones: updatedMilestones,
            progress: progress
          };
          
          return updatedGoalResult;
        }
        return goal;
      }));

      return updatedGoalResult;
    } catch (err) {
      console.error('Error updating milestone:', err);
      throw err;
    }
  }, [user, currentClub]);

  // Bulk update milestones (for reordering)
  const handleBulkUpdateMilestones = useCallback(async (goalId, milestones) => {
    if (!user || !currentClub || !goalId) return;

    try {
      // Update goal with new milestones array
      const result = await updateGoal(user.uid, currentClub.id, goalId, { milestones });
      
      // Update goal in state
      setGoals(prev => prev.map(goal => {
        if (goal.id === goalId) {
          const updatedGoal = normalizeGoal(result, result.id, true);
          return {
            ...updatedGoal,
            entries: goal.entries || [],
            entriesPagination: goal.entriesPagination || {
              hasMore: true,
              offset: 0,
              limit: 10
            }
          };
        }
        return goal;
      }));

      return normalizeGoal(result, result.id);
    } catch (err) {
      console.error('Error bulk updating milestones:', err);
      throw err;
    }
  }, [user, currentClub]);

  // ******************EXPORTS**********************
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
        createEntry: handleCreateEntry,
        updateEntry: handleUpdateEntry,
        deleteEntry: handleDeleteEntry,
        fetchGoalEntries: handleFetchGoalEntries,
        fetchGoalEntriesForMonth: handleFetchGoalEntriesForMonth,
        createMilestone: handleCreateMilestone,
        deleteMilestone: handleDeleteMilestone,
        updateMilestone: handleUpdateMilestone,
        bulkUpdateMilestones: handleBulkUpdateMilestones,
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
