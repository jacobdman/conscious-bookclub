import React from 'react';

export default React.createContext({
  posts: [],
  loading: false,
  loadingMore: false,
  error: null,
  unreadCount: 0,
  lastReadTimestamp: null,
  hasMore: false,
  fetchPosts: async () => {},
  loadMorePosts: async () => {},
  createPost: async () => {},
  createReply: async () => {},
  addReaction: async () => {},
  removeReaction: async () => {},
  markAsRead: async () => {},
  scrollToPost: () => {},
});

