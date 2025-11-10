import { apiCall } from '../apiHelpers';

// Posts functions
export const getPosts = async (clubId, options = {}) => {
  const params = new URLSearchParams({ clubId: clubId.toString() });
  
  if (options.limit) {
    params.append('limit', options.limit.toString());
  }
  
  if (options.beforeId) {
    params.append('beforeId', options.beforeId.toString());
  }
  
  const result = await apiCall(`/v1/posts?${params}`);
  return result;
};

export const getPost = async (clubId, postId) => {
  const params = new URLSearchParams({ clubId: clubId.toString() });
  const post = await apiCall(`/v1/posts/${postId}?${params}`);
  return post;
};

export const createPost = async (clubId, post) => {
  const params = new URLSearchParams({ clubId: clubId.toString() });
  const result = await apiCall(`/v1/posts?${params}`, {
    method: 'POST',
    body: JSON.stringify(post),
  });
  return result;
};

// Alias for backward compatibility
export const addPost = createPost;

export const addReaction = async (clubId, postId, emoji, userId) => {
  const params = new URLSearchParams({ clubId: clubId.toString() });
  const result = await apiCall(`/v1/posts/${postId}/reactions?${params}`, {
    method: 'POST',
    body: JSON.stringify({ emoji, userId }),
  });
  return result;
};

export const removeReaction = async (clubId, postId, emoji, userId) => {
  const params = new URLSearchParams({ 
    clubId: clubId.toString(),
    userId: userId,
  });
  const encodedEmoji = encodeURIComponent(emoji);
  await apiCall(`/v1/posts/${postId}/reactions/${encodedEmoji}?${params}`, {
    method: 'DELETE',
  });
};

export const getReactions = async (clubId, postId) => {
  const params = new URLSearchParams({ clubId: clubId.toString() });
  const reactions = await apiCall(`/v1/posts/${postId}/reactions?${params}`);
  return reactions;
};

