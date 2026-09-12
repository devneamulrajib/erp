import api from './axios';

export const getProjectManagers = () => api.get('/project-managers').then((res) => res.data);
export const createProjectManager = (data) => api.post('/project-managers', data).then((res) => res.data);
export const deleteProjectManager = (id) => api.delete(`/project-managers/${id}`).then((res) => res.data);