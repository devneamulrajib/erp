import api from './axios';

export const getProjects = () => api.get('/projects');
export const deleteProject = (id) => api.delete(`/projects/${id}`);