// client/src/api/userManagement.js
import api from './axios';

export const getUsers = () => api.get('/users').then((res) => res.data);
export const addUser = (data) => api.post('/users', data).then((res) => res.data);
export const updateUserRole = (id, role, roles) =>
  api.put(`/users/${id}/role`, { role, roles }).then((res) => res.data);
export const updateUserStatus = (id, isActive) =>
  api.put(`/users/${id}/status`, { isActive }).then((res) => res.data);
export const deleteUser = (id) => api.delete(`/users/${id}`).then((res) => res.data);