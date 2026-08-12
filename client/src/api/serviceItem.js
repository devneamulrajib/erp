import api from './axios';

export const getServiceItems = (params) => api.get('/service-items', { params });
export const getNextServiceItemCode = () => api.get('/service-items/next-code');
export const createServiceItem = (data) => api.post('/service-items', data);
export const updateServiceItem = (id, data) => api.put(`/service-items/${id}`, data);
export const deleteServiceItem = (id) => api.delete(`/service-items/${id}`);