import api from './axios';

export const getChartOfGroups = (params) => api.get('/chart-of-group', { params });
export const getChartOfGroupOptions = () => api.get('/chart-of-group/options');
export const getChartOfGroupHierarchy = () => api.get('/chart-of-group/hierarchy');
export const createChartOfGroup = (data) => api.post('/chart-of-group', data);
export const updateChartOfGroup = (id, data) => api.put(`/chart-of-group/${id}`, data);
export const deleteChartOfGroup = (id) => api.delete(`/chart-of-group/${id}`);