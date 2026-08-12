import api from './axios';

export const getUnits = (params) => api.get('/unit', { params });
export const getNextUnitCode = () => api.get('/unit/next-code');
export const createUnit = (data) => api.post('/unit', data);
export const updateUnit = (id, data) => api.put(`/unit/${id}`, data);
export const deleteUnit = (id) => api.delete(`/unit/${id}`);