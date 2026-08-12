import api from './axios';

export async function getPurchases(params = {}) {
  const res = await api.get('/purchase', { params });
  return res.data;
}
export async function getPurchase(id) {
  const res = await api.get(`/purchase/${id}`);
  return res.data;
}
export async function getNextPurchaseCode() {
  const res = await api.get('/purchase/next-code');
  return res.data.code;
}
export async function getItemStockQty(itemId) {
  const res = await api.get(`/purchase/stock/${itemId}`);
  return res.data.stockQty;
}
export async function createPurchase(payload) {
  const res = await api.post('/purchase', payload);
  return res.data;
}
export async function updatePurchase(id, payload) {
  const res = await api.put(`/purchase/${id}`, payload);
  return res.data;
}
export async function deletePurchase(id) {
  const res = await api.delete(`/purchase/${id}`);
  return res.data;
}