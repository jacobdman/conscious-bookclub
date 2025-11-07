import { apiCall } from '../apiHelpers';

// Posts functions
export const getPosts = async (clubId) => {
  const params = new URLSearchParams({ clubId: clubId.toString() });
  const posts = await apiCall(`/v1/posts?${params}`);
  return posts;
};

export const addPost = async (clubId, post) => {
  const params = new URLSearchParams({ clubId: clubId.toString() });
  const result = await apiCall(`/v1/posts?${params}`, {
    method: 'POST',
    body: JSON.stringify(post),
  });
  return result;
};

