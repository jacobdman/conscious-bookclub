import { apiCall } from '../apiHelpers';

// Posts functions
export const getPosts = async () => {
  const posts = await apiCall('/v1/posts');
  return { docs: posts.map(post => ({ id: post.id, data: () => post })) };
};

export const addPost = async (post) => {
  const result = await apiCall('/v1/posts', {
    method: 'POST',
    body: JSON.stringify(post),
  });
  return { id: result.id };
};

