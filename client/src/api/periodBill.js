import api from './axios';

export async function getPeriodBills(params = {}) {
  const res = await api.get('/period-bill', { params });
  return res.data;
}
export async function getPeriodBill(id) {
  const res = await api.get(`/period-bill/${id}`);
  return res.data;
}
export async function getNextPeriodBillCode() {
  const res = await api.get('/period-bill/next-code');
  return res.data.code;
}
export async function createPeriodBill(payload) {
  const res = await api.post('/period-bill', payload);
  return res.data;
}
export async function updatePeriodBill(id, payload) {
  const res = await api.put(`/period-bill/${id}`, payload);
  return res.data;
}
export async function deletePeriodBill(id) {
  const res = await api.delete(`/period-bill/${id}`);
  return res.data;
}
export async function uploadPeriodBillAttachment(id, file) {
  const fd = new FormData();
  fd.append('attachment', file);
  const res = await api.post(`/period-bill/${id}/attachment`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}