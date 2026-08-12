import api from './axios';

export async function getContractorWorkorders(params = {}) {
  const res = await api.get('/contractor-workorder', { params });
  return res.data;
}
export async function getContractorWorkorder(id) {
  const res = await api.get(`/contractor-workorder/${id}`);
  return res.data;
}
export async function getNextContractorWorkorderCode() {
  const res = await api.get('/contractor-workorder/next-code');
  return res.data.code;
}
export async function createContractorWorkorder(payload) {
  const res = await api.post('/contractor-workorder', payload);
  return res.data;
}
export async function updateContractorWorkorder(id, payload) {
  const res = await api.put(`/contractor-workorder/${id}`, payload);
  return res.data;
}
export async function deleteContractorWorkorder(id) {
  const res = await api.delete(`/contractor-workorder/${id}`);
  return res.data;
}