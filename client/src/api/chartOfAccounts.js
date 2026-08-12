import api from './axios';

export const getChartOfAccounts = (params) => api.get('/chart-of-accounts', { params });
export const createChartOfAccount = (data) => api.post('/chart-of-accounts', data);
export const updateChartOfAccount = (id, data) => api.put(`/chart-of-accounts/${id}`, data);
export const deleteChartOfAccount = (id) => api.delete(`/chart-of-accounts/${id}`);