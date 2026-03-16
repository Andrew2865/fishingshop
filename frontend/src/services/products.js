import API from './api';

export const getProducts = (params) => API.get('/products', { params });
export const getProductsAdmin = () => API.get('/products/admin/all');
export const getProductsWarehouse = () => API.get('/products/warehouse/all');
export const getProduct = (id) => API.get(`/products/${id}`);
export const getProductReviews = (id) => API.get(`/products/${id}/reviews`);

export const createProduct = (data) => API.post('/products', data);
export const updateProduct = (id, data) => API.put(`/products/${id}`, data);
export const deleteProduct = (id) => API.delete(`/products/${id}`);
export const addOrUpdateProductReview = (id, data) => API.post(`/products/${id}/reviews`, data);

export const uploadProductImage = (id, file) => {
  const form = new FormData();
  form.append('image', file);
  return API.post(`/products/${id}/image`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const uploadProductGalleryImages = (id, files) => {
  const form = new FormData();
  Array.from(files || []).forEach((file) => form.append('images', file));
  return API.post(`/products/${id}/gallery-images`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const deleteProductGalleryImage = (id, imageId) => API.delete(`/products/${id}/gallery-images/${imageId}`);

export const updateProductStock = (id, data) => API.patch(`/products/${id}/stock`, data);
export const getProductStockMovements = (id) => API.get(`/products/${id}/stock-movements`);
