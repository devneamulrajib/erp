import api from './axios';

export const getChartOfGroups = (params) => api.get('/chart-of-group', { params }).then((res) => res.data);
export const getChartOfGroupOptions = () => api.get('/chart-of-group/options').then((res) => res.data);
export const getChartOfGroupHierarchy = () => api.get('/chart-of-group/hierarchy').then((res) => res.data);
export const createChartOfGroup = (data) => api.post('/chart-of-group', data).then((res) => res.data);
export const updateChartOfGroup = (id, data) => api.put(`/chart-of-group/${id}`, data).then((res) => res.data);
export const deleteChartOfGroup = (id) => api.delete(`/chart-of-group/${id}`).then((res) => res.data);