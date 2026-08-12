import api from './axios';

export const getAreas = (params) => api.get('/area', { params });
export const createArea = (data) => api.post('/area', data);
export const updateArea = (id, data) => api.put(`/area/${id}`, data);
export const deleteArea = (id) => api.delete(`/area/${id}`);