import React from 'react';

export default React.createContext({
  queue: [],
  activeQueue: 'discover',
  remainingSuperLikes: 0,
  promotionThreshold: 0,
  loading: false,
  error: null,
  isBacklogReview: false,
  isBacklogReviewForBook: () => false,
  setActiveQueue: () => {},
  refreshQueue: async () => {},
  skipCurrent: () => {},
  submitAction: async () => {},
  removeSuperLike: async () => {},
  close: () => {},
});
