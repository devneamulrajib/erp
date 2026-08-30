import api from './axios';

export const getCategories = (params) =>
  api.get('/categories', { params }).then((res) => res.data);

export const getNextCategoryCode = () =>
  api.get('/categories/next-code').then((res) => res.data);

export const createCategory = (data) =>
  api.post('/categories', data).then((res) => res.data);

export const updateCategory = (id, data) =>
  api.put(`/categories/${id}`, data).then((res) => res.data);

export const deleteCategory = (id) =>
  api.delete(`/categories/${id}`).then((res) => res.data);