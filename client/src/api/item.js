import api from './axios';

export const getItems = (params) => api.get('/item', { params });
export const createItem = (data) => api.post('/item', data);
export const updateItem = (id, data) => api.put(`/item/${id}`, data);
export const deleteItem = (id) => api.delete(`/item/${id}`);