import api from './axios';

export const getBoqTitles = () => api.get('/boq-titles').then((res) => res.data);
export const createBoqTitle = (data) => api.post('/boq-titles', data).then((res) => res.data);
export const updateBoqTitle = (id, data) => api.put(`/boq-titles/${id}`, data).then((res) => res.data);
export const deleteBoqTitle = (id) => api.delete(`/boq-titles/${id}`).then((res) => res.data);
export const getProjectTypeOptions = () => api.get('/project-types').then((res) => res.data);