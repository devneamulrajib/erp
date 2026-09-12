import api from './axios';

export async function getLabourBills(params = {}) {
  const res = await api.get('/labour-bill', { params });
  return res.data;
}
export async function getLabourBill(id) {
  const res = await api.get(`/labour-bill/${id}`);
  return res.data;
}
export async function getNextLabourBillCode() {
  const res = await api.get('/labour-bill/next-code');
  return res.data.code;
}
export async function createLabourBill(payload) {
  const res = await api.post('/labour-bill', payload);
  return res.data;
}
export async function updateLabourBill(id, payload) {
  const res = await api.put(`/labour-bill/${id}`, payload);
  return res.data;
}
export async function deleteLabourBill(id) {
  const res = await api.delete(`/labour-bill/${id}`);
  return res.data;
}
export async function uploadLabourBillAttachment(id, file) {
  const formData = new FormData();
  formData.append('attachment', file);
  const res = await api.post(`/labour-bill/${id}/attachment`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}
export async function updateLabourBillStatus(id, status) {
  const res = await api.patch(`/labour-bill/${id}/status`, { status });
  return res.data;
}