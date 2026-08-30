import api from './axios';

export const getServiceItems = (params) => api.get('/service-items', { params }).then((res) => res.data);
export const getNextServiceItemCode = () => api.get('/service-items/next-code').then((res) => res.data);
export const createServiceItem = (data) => api.post('/service-items', data).then((res) => res.data);
export const updateServiceItem = (id, data) => api.put(`/service-items/${id}`, data).then((res) => res.data);
export const deleteServiceItem = (id) => api.delete(`/service-items/${id}`).then((res) => res.data);