import API from './api';

export const getPosts = () => API.get('/forum/posts');
export const getPost = (id) => API.get(`/forum/posts/${id}`);
export const getComments = (postId) => API.get(`/forum/posts/${postId}/comments`);
export const createPost = (data) => API.post('/forum/posts', data);
export const createComment = (postId, data) => API.post(`/forum/posts/${postId}/comments`, data);


