import api from './axios';

export const getAssets = () => api.get('/assets');
export const getAsset = (id) => api.get(`/assets/${id}`);
export const createAsset = (data) => api.post('/assets', data);
export const updateAsset = (id, data) => api.put(`/assets/${id}`, data);
export const deleteAsset = (id) => api.delete(`/assets/${id}`);

export const addDepreciationEntry = (id, data) => api.post(`/assets/${id}/depreciation`, data);
export const addMovementEntry = (id, data) => api.post(`/assets/${id}/movement`, data);
export const addRevaluationEntry = (id, data) => api.post(`/assets/${id}/revaluation`, data);

// Reused option sources
export const getItemOptions = () => api.get('/item');
export const getProjectOptions = () => api.get('/projects');