import api from './axios';

export const getBoqTitles = () => api.get('/boq-titles');
export const createBoqTitle = (data) => api.post('/boq-titles', data);
export const updateBoqTitle = (id, data) => api.put(`/boq-titles/${id}`, data);
export const deleteBoqTitle = (id) => api.delete(`/boq-titles/${id}`);

export const getProjectTypeOptions = () => api.get('/project-types');