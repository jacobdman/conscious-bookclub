import React from 'react';

export default React.createContext({
  clubGoals: [],
  clubGoalsByUser: {},
  loading: false,
  error: null,
  fetchUserGoals: async () => [],
  refreshClubGoals: async () => [],
});
