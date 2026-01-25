import React from 'react';

export default React.createContext({
  currentClub: null,
  userClubs: [],
  clubMembers: [],
  membersGoalStatus: {},
  loading: false,
  error: null,
  setCurrentClub: () => {},
  refreshClubs: async () => {},
  refreshClubMembers: async () => {},
});

