import portalApi from './portalAxios';

export async function getEmployeeProfile() {
  const res = await portalApi.get('/employee/profile');
  return res.data;
}

export async function getEmployeeAttendance(month) {
  const res = await portalApi.get('/employee/attendance', { params: month ? { month } : {} });
  return res.data;
}

export async function getTodayAttendance() {
  const res = await portalApi.get('/employee/attendance/today');
  return res.data;
}

export async function checkInAttendance() {
  const res = await portalApi.post('/employee/attendance/check-in');
  return res.data;
}

// { view: 'month', year, month } or { view: 'year', year }
export async function getAttendanceSummary(params) {
  const res = await portalApi.get('/employee/attendance/summary', { params });
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

/* ---------- Salary (dashboard) ---------- */

// Re-enter the account password to get a 5-minute unlock token
export async function unlockSalary(password) {
  const res = await portalApi.post('/employee/salary/unlock', { password });
  return res.data; // { unlockToken, expiresInSeconds }
}

// Amounts require a valid unlock token
export async function getSalarySummary(unlockToken) {
  const res = await portalApi.get('/employee/salary/summary', {
    headers: unlockToken ? { 'x-salary-unlock': unlockToken } : {},
  });
  return res.data;
}

export async function getSalaryMonths(year) {
  const res = await portalApi.get('/employee/salary/months', { params: year ? { year } : {} });
  return res.data;
}

export async function downloadPayslip(id, filename) {
  const res = await portalApi.get(`/employee/salary/payslips/${id}/pdf`, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `Payslip-${id}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ---------- My Requests ---------- */

export async function getAttendanceCorrections() {
  const res = await portalApi.get('/employee/requests/attendance-corrections');
  return res.data;
}

// { date: 'YYYY-MM-DD', reason }
export async function requestAttendanceCorrection(payload) {
  const res = await portalApi.post('/employee/requests/attendance-corrections', payload);
  return res.data;
}

export async function cancelAttendanceCorrection(id) {
  const res = await portalApi.delete(`/employee/requests/attendance-corrections/${id}`);
  return res.data;
}

export async function cancelLeaveRequest(id) {
  const res = await portalApi.delete(`/employee/requests/leave/${id}`);
  return res.data;
}

export async function cancelAdvanceRequest(id) {
  const res = await portalApi.delete(`/employee/requests/advances/${id}`);
  return res.data;
}

/* ---------- Account ---------- */

// { currentPassword, newPassword }
export async function changePassword(payload) {
  const res = await portalApi.post('/employee/account/change-password', payload);
  return res.data;
}