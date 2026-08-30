import api from './axios';

export const getEmployees = (params) => api.get('/employee', { params });
export const getNextEmployeeCode = () => api.get('/employee/next-code');
export const createEmployee = (data) => api.post('/employee', data);
export const updateEmployee = (id, data) => api.put(`/employee/${id}`, data);
export const deleteEmployee = (id) => api.delete(`/employee/${id}`);