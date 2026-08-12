import api from './axios';

export const getProfessions = (params) => api.get('/profession', { params });
export const createProfession = (data) => api.post('/profession', data);
export const updateProfession = (id, data) => api.put(`/profession/${id}`, data);
export const deleteProfession = (id) => api.delete(`/profession/${id}`);