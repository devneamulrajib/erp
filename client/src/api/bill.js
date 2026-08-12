import api from './axios';

export async function getBills(params = {}) {
  const res = await api.get('/bill', { params });
  return res.data;
}
export async function getBill(id) {
  const res = await api.get(`/bill/${id}`);
  return res.data;
}
export async function getNextBillCode() {
  const res = await api.get('/bill/next-code');
  return res.data.code;
}
export async function createBill(payload) {
  const res = await api.post('/bill', payload);
  return res.data;
}
export async function updateBill(id, payload) {
  const res = await api.put(`/bill/${id}`, payload);
  return res.data;
}
export async function deleteBill(id) {
  const res = await api.delete(`/bill/${id}`);
  return res.data;
}