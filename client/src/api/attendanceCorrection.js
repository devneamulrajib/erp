import api from './axios';

export async function getAttendanceCorrections(params) {
  const res = await api.get('/attendance-corrections', { params });
  return res.data;
}

export async function approveAttendanceCorrection(id, adminNote = '') {
  const res = await api.patch(`/attendance-corrections/${id}/approve`, { adminNote });
  return res.data;
}

export async function rejectAttendanceCorrection(id, adminNote) {
  const res = await api.patch(`/attendance-corrections/${id}/reject`, { adminNote });
  return res.data;
}