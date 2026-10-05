import api from './axios';

export const getEmployees = (params = {}) => api.get('/employee', { params });
export const getNextEmployeeCode = () => api.get('/employee/next-code');
export const createEmployee = (data) => api.post('/employee', data);
export const updateEmployee = (id, data) => api.put(`/employee/${id}`, data);
export const deleteEmployee = (id) => api.delete(`/employee/${id}`);
export const bulkDeleteEmployees = (ids) => api.delete('/employee/bulk', { data: { ids } });
export const wipeAllEmployees = () => api.delete('/employee/all');

export const getEmployeeAdvances = () => api.get('/employee/advances/all');
export const getEmployeeAdvanceSummary = () => api.get('/employee/advances/summary');
export const requestEmployeeAdvance = (data) => api.post('/employee/advances/request', data);
export const disburseEmployeeAdvance = (id, data) => api.post(`/employee/advances/${id}/disburse`, data);
export const rejectEmployeeAdvance = (id) => api.post(`/employee/advances/${id}/reject`);
export const bulkDeleteAdvances = (ids) => api.delete('/employee/advances/bulk', { data: { ids } });
export const wipeAllAdvances = () => api.delete('/employee/advances/all');

// Employee Portal (admin side)
export const setEmployeePortalAccess = (id, payload) => api.put(`/portal-admin/employees/${id}/access`, payload);
export const getAttendanceForDate = (date) => api.get('/employee/attendance', { params: { date } });
export const markAttendance = (date, records) => api.post('/employee/attendance/mark', { date, records });
export const bulkDeleteAttendance = (date, employeeIds) =>
  api.delete('/employee/attendance/bulk', { data: { date, employeeIds } });
export const wipeAttendanceByDate = (date) => api.delete('/employee/attendance/by-date', { params: { date } });

export const getLeaveRequests = () => api.get('/employee/leave-requests');
export const approveLeaveRequest = (id, adminNote) => api.post(`/employee/leave-requests/${id}/approve`, { adminNote });
export const rejectLeaveRequest = (id, adminNote) => api.post(`/employee/leave-requests/${id}/reject`, { adminNote });
export const bulkDeleteLeaveRequests = (ids) => api.delete('/employee/leave-requests/bulk', { data: { ids } });
export const wipeAllLeaveRequests = () => api.delete('/employee/leave-requests/all');

export async function getAttendanceLog(params) {
  const res = await api.get('/employee/attendance/log', { params });
  return res.data;
}