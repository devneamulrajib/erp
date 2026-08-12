import api from './axios';

export async function getFundRequisitions(params = {}) {
  const res = await api.get('/fund-requisitions', { params });
  return res.data;
}

export async function getFundRequisition(id) {
  const res = await api.get(`/fund-requisitions/${id}`);
  return res.data;
}

export async function createFundRequisition(payload) {
  const res = await api.post('/fund-requisitions', payload);
  return res.data;
}

export async function updateFundRequisition(id, payload) {
  const res = await api.put(`/fund-requisitions/${id}`, payload);
  return res.data;
}

export async function addFundRequisitionPayment(id, payload) {
  const res = await api.post(`/fund-requisitions/${id}/payments`, payload);
  return res.data;
}

export async function deleteFundRequisition(id) {
  const res = await api.delete(`/fund-requisitions/${id}`);
  return res.data;
}