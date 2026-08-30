import api from './axios';

export async function getUnits(params) {
  const res = await api.get('/unit', { params });
  return res.data;
}
export async function getNextUnitCode() {
  const res = await api.get('/unit/next-code');
  return res.data;
}
export async function createUnit(data) {
  const res = await api.post('/unit', data);
  return res.data;
}
export async function updateUnit(id, data) {
  const res = await api.put(`/unit/${id}`, data);
  return res.data;
}
export async function deleteUnit(id) {
  const res = await api.delete(`/unit/${id}`);
  return res.data;
}