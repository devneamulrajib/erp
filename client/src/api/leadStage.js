import api from './axios';

export const getLeadStages = (params) => api.get('/lead-stage', { params });
export const createLeadStage = (data) => api.post('/lead-stage', data);
export const updateLeadStage = (id, data) => api.put(`/lead-stage/${id}`, data);
export const deleteLeadStage = (id) => api.delete(`/lead-stage/${id}`);