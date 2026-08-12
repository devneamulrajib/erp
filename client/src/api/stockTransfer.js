import api from './axios';

export async function getStockTransfers(params = {}) {
  const res = await api.get('/stock-transfer', { params });
  return res.data;
}
export async function getStockTransfer(id) {
  const res = await api.get(`/stock-transfer/${id}`);
  return res.data;
}
export async function getNextStockTransferCode() {
  const res = await api.get('/stock-transfer/next-code');
  return res.data.code;
}
export async function createStockTransfer(payload) {
  const res = await api.post('/stock-transfer', payload);
  return res.data;
}
export async function updateStockTransfer(id, payload) {
  const res = await api.put(`/stock-transfer/${id}`, payload);
  return res.data;
}
export async function deleteStockTransfer(id) {
  const res = await api.delete(`/stock-transfer/${id}`);
  return res.data;
}