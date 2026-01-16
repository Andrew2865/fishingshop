import API from './api';

export const getMe = () => API.get('/users/me');
export const updateMe = (data) => API.put('/users/me', data);
export const changePassword = (data) => API.put('/users/me/password', data);
