import api from './axios';

export const getChartOfAccounts = (params) => api.get('/chart-of-accounts', { params }).then((res) => res.data);
export const createChartOfAccount = (data) => api.post('/chart-of-accounts', data).then((res) => res.data);
export const updateChartOfAccount = (id, data) => api.put(`/chart-of-accounts/${id}`, data).then((res) => res.data);
export const deleteChartOfAccount = (id) => api.delete(`/chart-of-accounts/${id}`).then((res) => res.data);