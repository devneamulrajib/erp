import api from './axios';

export const getBrands = (params) => api.get('/brand', { params });
export const getNextBrandCode = () => api.get('/brand/next-code');
export const createBrand = (data) => api.post('/brand', data);
export const updateBrand = (id, data) => api.put(`/brand/${id}`, data);
export const deleteBrand = (id) => api.delete(`/brand/${id}`);