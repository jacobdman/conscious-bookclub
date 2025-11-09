import React from 'react';

export default React.createContext({
  posts: [],
  loading: false,
  error: null,
  fetchPosts: async () => {},
  createPost: async () => {},
  createReply: async () => {},
  addReaction: async () => {},
  removeReaction: async () => {},
  scrollToPost: () => {},
});

