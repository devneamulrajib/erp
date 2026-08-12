import api from './axios'; // ⚠️ adjust this import to match whatever your chartOfGroup.js api file uses

export const getCategories = (params) => api.get('/categories', { params });
export const getNextCategoryCode = () => api.get('/categories/next-code');
export const createCategory = (data) => api.post('/categories', data);
export const updateCategory = (id, data) => api.put(`/categories/${id}`, data);
export const deleteCategory = (id) => api.delete(`/categories/${id}`);