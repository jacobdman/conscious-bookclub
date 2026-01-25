import React from 'react';

export default React.createContext({
  clubGoals: [],
  clubGoalsByUser: {},
  loading: false,
  error: null,
  loadingByUser: {},
  fetchUserGoals: async () => [],
  refreshClubGoals: async () => [],
  prefetchUsersGoals: async () => {},
});
