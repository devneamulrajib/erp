import api from './axios';

export const getProjectTypes = () => api.get('/project-types').then((res) => res.data);
export const getNextProjectTypeCode = () => api.get('/project-types/next-code').then((res) => res.data.code);
export const createProjectType = (data) => api.post('/project-types', data).then((res) => res.data);
export const updateProjectType = (id, data) => api.put(`/project-types/${id}`, data).then((res) => res.data);
export const deleteProjectType = (id) => api.delete(`/project-types/${id}`).then((res) => res.data);