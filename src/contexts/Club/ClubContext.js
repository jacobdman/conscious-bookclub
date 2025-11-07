import React from 'react';

export default React.createContext({
  currentClub: null,
  userClubs: [],
  loading: false,
  error: null,
  setCurrentClub: () => {},
  refreshClubs: async () => {},
  refreshClubMembers: async () => {},
});

