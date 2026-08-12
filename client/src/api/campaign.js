import api from './axios';

export const getCampaigns = (params) => api.get('/campaign', { params });
export const createCampaign = (data) => api.post('/campaign', data);
export const updateCampaign = (id, data) => api.put(`/campaign/${id}`, data);
export const deleteCampaign = (id) => api.delete(`/campaign/${id}`);