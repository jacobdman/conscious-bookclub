import React from 'react';

export default React.createContext({
  goals: [],
  loading: false,
  error: null,
  addGoal: async () => {},
  updateGoal: async () => {},
  deleteGoal: async () => {},
  refreshGoals: async () => {},
});
