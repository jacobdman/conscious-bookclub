import React from 'react';

export default React.createContext({
  completedTutorials: {},
  activeTutorialId: null,
  startTutorial: () => {},
  stopTutorial: () => {},
  completeTutorial: async () => {},
  resetTutorial: async () => {},
  shouldShowTutorial: () => false,
});
