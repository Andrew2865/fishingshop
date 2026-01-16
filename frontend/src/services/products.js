import API from './api';

export const getProducts = (params) => API.get('/products', { params });
export const getProductsAdmin = () => API.get('/products/admin/all');
export const getProduct = (id) => API.get(`/products/${id}`);

export const createProduct = (data) => API.post('/products', data);
export const updateProduct = (id, data) => API.put(`/products/${id}`, data);
export const deleteProduct = (id) => API.delete(`/products/${id}`);

export const uploadProductImage = (id, file) => {
  const form = new FormData();
  form.append('image', file);
  return API.post(`/products/${id}/image`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
