import api from './axios';

export const getEmployees = (params = {}) => api.get('/employee', { params });
export const getNextEmployeeCode = () => api.get('/employee/next-code');
export const createEmployee = (data) => api.post('/employee', data);
export const updateEmployee = (id, data) => api.put(`/employee/${id}`, data);
export const deleteEmployee = (id) => api.delete(`/employee/${id}`);

export const getEmployeeAdvances = () => api.get('/employee/advances/all');
export const getEmployeeAdvanceSummary = () => api.get('/employee/advances/summary');
export const requestEmployeeAdvance = (data) => api.post('/employee/advances/request', data);
export const disburseEmployeeAdvance = (id, data) => api.post(`/employee/advances/${id}/disburse`, data);
export const rejectEmployeeAdvance = (id) => api.post(`/employee/advances/${id}/reject`);

// Employee Portal (admin side)
export const setEmployeePortalAccess = (id, payload) => api.put(`/portal-admin/employees/${id}/access`, payload);
export const getAttendanceForDate = (date) => api.get('/employee/attendance', { params: { date } });
export const markAttendance = (date, records) => api.post('/employee/attendance/mark', { date, records });
export const getLeaveRequests = () => api.get('/employee/leave-requests');
export const approveLeaveRequest = (id, adminNote) => api.post(`/employee/leave-requests/${id}/approve`, { adminNote });
export const rejectLeaveRequest = (id, adminNote) => api.post(`/employee/leave-requests/${id}/reject`, { adminNote });