import API from './api';

export const getOrderHistory = () => API.get('/orders/history');

export const getAdminOrders = () => API.get('/orders/admin/all');
export const updateAdminOrder = (id, data) => API.put(`/orders/admin/${id}`, data);

export const getWarehouseOrders = () => API.get('/orders/warehouse/all');
export const updateWarehouseOrder = (id, data) => API.put(`/orders/warehouse/${id}`, data);
