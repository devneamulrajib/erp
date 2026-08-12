import api from './axios';

export async function getSales(params = {}) {
  const res = await api.get('/sales', { params });
  return res.data;
}
export async function getSale(id) {
  const res = await api.get(`/sales/${id}`);
  return res.data;
}
export async function getNextSaleCode() {
  const res = await api.get('/sales/next-code');
  return res.data.code;
}
export async function createSale(payload) {
  const res = await api.post('/sales', payload);
  return res.data;
}
export async function updateSale(id, payload) {
  const res = await api.put(`/sales/${id}`, payload);
  return res.data;
}
export async function deleteSale(id) {
  const res = await api.delete(`/sales/${id}`);
  return res.data;
}