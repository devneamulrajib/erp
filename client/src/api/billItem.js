import api from './axios';

export async function getBillItems(params) {
  const res = await api.get('/bill-items', { params });
  return res.data;
}
export async function getNextBillItemCode() {
  const res = await api.get('/bill-items/next-code');
  return res.data;
}
export async function createBillItem(data) {
  const res = await api.post('/bill-items', data);
  return res.data;
}
export async function updateBillItem(id, data) {
  const res = await api.put(`/bill-items/${id}`, data);
  return res.data;
}
export async function deleteBillItem(id) {
  const res = await api.delete(`/bill-items/${id}`);
  return res.data;
}