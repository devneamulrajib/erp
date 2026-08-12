import api from './axios';

export async function getMaterialUsages(params = {}) {
  const res = await api.get('/material-usage', { params });
  return res.data;
}
export async function getMaterialUsage(id) {
  const res = await api.get(`/material-usage/${id}`);
  return res.data;
}
export async function getNextMaterialUsageCode() {
  const res = await api.get('/material-usage/next-code');
  return res.data.code;
}
export async function createMaterialUsage(payload) {
  const res = await api.post('/material-usage', payload);
  return res.data;
}
export async function updateMaterialUsage(id, payload) {
  const res = await api.put(`/material-usage/${id}`, payload);
  return res.data;
}
export async function deleteMaterialUsage(id) {
  const res = await api.delete(`/material-usage/${id}`);
  return res.data;
}