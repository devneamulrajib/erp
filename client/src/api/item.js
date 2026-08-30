import api from './axios';

export const getItems = async (params) => {
  const res = await api.get('/item', { params });
  return res.data;
};
export const createItem = async (data) => {
  const res = await api.post('/item', data);
  return res.data;
};
export const updateItem = async (id, data) => {
  const res = await api.put(`/item/${id}`, data);
  return res.data;
};
export const deleteItem = async (id) => {
  const res = await api.delete(`/item/${id}`);
  return res.data;
};