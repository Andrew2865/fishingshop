import API from './api';

export const getOrderHistory = () => API.get('/orders/history');
