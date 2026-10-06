import api from './axios';

// params: from (user id), approveStatus, paymentState, projectId, dateFrom, dateTo
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

// payload: { approvedAmount, note }
export async function approveFundRequisition(id, payload) {
  const res = await api.post(`/fund-requisitions/${id}/approve`, payload);
  return res.data;
}

// payload: { reason }
export async function rejectFundRequisition(id, payload) {
  const res = await api.post(`/fund-requisitions/${id}/reject`, payload);
  return res.data;
}

// payload: { amount, method, date, reference, note, markDone }
export async function addFundRequisitionPayment(id, payload) {
  const res = await api.post(`/fund-requisitions/${id}/payments`, payload);
  return res.data;
}

// payload: { reason }
export async function cancelFundRequisition(id, payload) {
  const res = await api.post(`/fund-requisitions/${id}/cancel`, payload);
  return res.data;
}

export async function deleteFundRequisition(id) {
  const res = await api.delete(`/fund-requisitions/${id}`);
  return res.data;
}