import api from './axios';

export async function getPurchaseOrders(params = {}) {
  const res = await api.get('/purchase-order', { params });
  return res.data;
}
export async function getPurchaseOrder(id) {
  const res = await api.get(`/purchase-order/${id}`);
  return res.data;
}
export async function getNextPurchaseOrderCode() {
  const res = await api.get('/purchase-order/next-code');
  return res.data.code;
}
export async function createPurchaseOrder(payload) {
  const res = await api.post('/purchase-order', payload);
  return res.data;
}
export async function updatePurchaseOrder(id, payload) {
  const res = await api.put(`/purchase-order/${id}`, payload);
  return res.data;
}
export async function deletePurchaseOrder(id) {
  const res = await api.delete(`/purchase-order/${id}`);
  return res.data;
}