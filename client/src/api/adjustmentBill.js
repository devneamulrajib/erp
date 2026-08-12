import api from './axios';

export async function getAdjustmentBills(params = {}) {
  const res = await api.get('/adjustment-bill', { params });
  return res.data;
}
export async function getAdjustmentBill(id) {
  const res = await api.get(`/adjustment-bill/${id}`);
  return res.data;
}
export async function getNextAdjustmentBillCode() {
  const res = await api.get('/adjustment-bill/next-code');
  return res.data.code;
}
export async function createAdjustmentBill(payload) {
  const res = await api.post('/adjustment-bill', payload);
  return res.data;
}
export async function updateAdjustmentBill(id, payload) {
  const res = await api.put(`/adjustment-bill/${id}`, payload);
  return res.data;
}
export async function deleteAdjustmentBill(id) {
  const res = await api.delete(`/adjustment-bill/${id}`);
  return res.data;
}