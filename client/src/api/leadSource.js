import api from './axios';

export const getLeadSources = (params) => api.get('/lead-source', { params });
export const createLeadSource = (data) => api.post('/lead-source', data);
export const updateLeadSource = (id, data) => api.put(`/lead-source/${id}`, data);
export const deleteLeadSource = (id) => api.delete(`/lead-source/${id}`);