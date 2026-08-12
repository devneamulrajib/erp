import api from './axios';

export async function getWorkorders(params = {}) {
  const res = await api.get('/workorder', { params });
  return res.data;
}
export async function getWorkorder(id) {
  const res = await api.get(`/workorder/${id}`);
  return res.data;
}
export async function getNextWorkorderCode() {
  const res = await api.get('/workorder/next-code');
  return res.data.code;
}
export async function createWorkorder(payload) {
  const res = await api.post('/workorder', payload);
  return res.data;
}
export async function updateWorkorder(id, payload) {
  const res = await api.put(`/workorder/${id}`, payload);
  return res.data;
}
export async function deleteWorkorder(id) {
  const res = await api.delete(`/workorder/${id}`);
  return res.data;
}