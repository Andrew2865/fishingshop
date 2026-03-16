import API from './api';

export const getPosts = (params) => API.get('/forum/posts', { params });
export const getPost = (id) => API.get(`/forum/posts/${id}`);
export const getComments = (postId) => API.get(`/forum/posts/${postId}/comments`);

export const createPost = (data) => {
  if (data instanceof FormData) {
    return API.post('/forum/posts', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  }
  return API.post('/forum/posts', data);
};

export const createComment = (postId, data) => {
  if (data instanceof FormData) {
    return API.post(`/forum/posts/${postId}/comments`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  }
  return API.post(`/forum/posts/${postId}/comments`, data);
};
