import API from './api';

export const getCategories = () => API.get('/categories');

export const createCategory = (data) => API.post('/categories', data, {
  headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
});

export const updateCategory = (id, data) => API.put(`/categories/${id}`, data, {
  headers: data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
});

export const deleteCategory = (id) => API.delete(`/categories/${id}`);
