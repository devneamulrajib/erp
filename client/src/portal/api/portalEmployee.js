import portalApi from './portalAxios';

export async function getEmployeeProfile() {
  const res = await portalApi.get('/employee/profile');
  return res.data;
}

export async function getEmployeeAttendance(month) {
  const res = await portalApi.get('/employee/attendance', { params: month ? { month } : {} });
  return res.data;
}

export async function getEmployeeAdvances() {
  const res = await portalApi.get('/employee/advances');
  return res.data;
}

export async function requestEmployeeAdvance(payload) {
  const res = await portalApi.post('/employee/advances', payload);
  return res.data;
}

export async function getEmployeeLeaveRequests() {
  const res = await portalApi.get('/employee/leave-requests');
  return res.data;
}

export async function requestEmployeeLeave(payload) {
  const res = await portalApi.post('/employee/leave-requests', payload);
  return res.data;
}