import api from './axios';

export async function getContractorBills(params = {}) {
  const res = await api.get('/contractor-bill', { params });
  return res.data;
}
export async function getContractorBill(id) {
  const res = await api.get(`/contractor-bill/${id}`);
  return res.data;
}
export async function getNextContractorBillCode() {
  const res = await api.get('/contractor-bill/next-code');
  return res.data.code;
}
export async function createContractorBill(payload) {
  const res = await api.post('/contractor-bill', payload);
  return res.data;
}
export async function updateContractorBill(id, payload) {
  const res = await api.put(`/contractor-bill/${id}`, payload);
  return res.data;
}
export async function deleteContractorBill(id) {
  const res = await api.delete(`/contractor-bill/${id}`);
  return res.data;
}
export async function uploadContractorBillAttachment(id, file) {
  const formData = new FormData();
  formData.append('attachment', file);
  const res = await api.post(`/contractor-bill/${id}/attachment`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}