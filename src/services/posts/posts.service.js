import { apiCall } from '../apiHelpers';

// Posts functions
export const getPosts = async () => {
  const posts = await apiCall('/v1/posts');
  return posts;
};

export const addPost = async (post) => {
  const result = await apiCall('/v1/posts', {
    method: 'POST',
    body: JSON.stringify(post),
  });
  return result;
};

