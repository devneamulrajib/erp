// client/src/api/employee.js
import api from './axios';

export const getEmployees = (params) => api.get('/employee', { params });
export const getNextEmployeeCode = () => api.get('/employee/next-code');
export const createEmployee = (data) => api.post('/employee', data);
export const updateEmployee = (id, data) => api.put(`/employee/${id}`, data);
export const deleteEmployee = (id) => api.delete(`/employee/${id}`);

// Advance Salary & Loan
export const getEmployeeAdvances = () => api.get('/employee/advances/all');
export const requestEmployeeAdvance = (data) => api.post('/employee/advances/request', data);
export const disburseEmployeeAdvance = (id, data) => api.post(`/employee/advances/${id}/disburse`, data);