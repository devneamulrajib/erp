import api from './axios';

export const getCategories = (params) =>
  api.get('/category', { params }).then((res) => res.data);

export const getNextCategoryCode = () =>
  api.get('/category/next-code').then((res) => res.data);

export const createCategory = (data) =>
  api.post('/category', data).then((res) => res.data);

export const updateCategory = (id, data) =>
  api.put(`/category/${id}`, data).then((res) => res.data);

export const deleteCategory = (id) =>
  api.delete(`/category/${id}`).then((res) => res.data);
