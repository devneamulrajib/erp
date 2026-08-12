import api from './axios';

export const getLeadCategories = (params) => api.get('/lead-category', { params });
export const getNextLeadCategoryCode = () => api.get('/lead-category/next-code');
export const createLeadCategory = (data) => api.post('/lead-category', data);
export const updateLeadCategory = (id, data) => api.put(`/lead-category/${id}`, data);
export const deleteLeadCategory = (id) => api.delete(`/lead-category/${id}`);