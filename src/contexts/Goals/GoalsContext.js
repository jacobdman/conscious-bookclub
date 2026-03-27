import React from 'react';

export default React.createContext({
  goals: [],
  loading: false,
  error: null,
  addGoal: async () => {},
  updateGoal: async () => {},
  pauseGoal: async () => {},
  resumeGoal: async () => {},
  deleteGoal: async () => {},
  refreshGoals: async () => {},
  createEntry: async () => {},
  updateEntry: async () => {},
  deleteEntry: async () => {},
  fetchGoalEntries: async () => {},
  fetchGoalEntriesForMonth: async () => {},
  fetchGoalEntriesAll: async () => {},
  createMilestone: async () => {},
  deleteMilestone: async () => {},
  updateMilestone: async () => {},
  bulkUpdateMilestones: async () => {},
});
