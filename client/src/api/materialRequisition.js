import api from './axios';

export async function getMaterialRequisitions(params = {}) {
  const res = await api.get('/material-requisitions', { params });
  return res.data;
}

export async function getMaterialRequisition(id) {
  const res = await api.get(`/material-requisitions/${id}`);
  return res.data;
}

export async function createMaterialRequisition(payload) {
  const res = await api.post('/material-requisitions', payload);
  return res.data;
}

export async function updateMaterialRequisition(id, payload) {
  const res = await api.put(`/material-requisitions/${id}`, payload);
  return res.data;
}

export async function deleteMaterialRequisition(id) {
  const res = await api.delete(`/material-requisitions/${id}`);
  return res.data;
}

export async function getNextRequisitionCode() {
  const res = await api.get('/material-requisitions/next-code');
  return res.data;
}

export async function convertRequisitionToPurchase(id) {
  const res = await api.post(`/material-requisitions/${id}/convert-to-purchase`);
  return res.data;
}

export async function convertRequisitionToPurchaseOrder(id) {
  const res = await api.post(`/material-requisitions/${id}/convert-to-purchase-order`);
  return res.data;
}

export async function convertRequisitionToRfq(id) {
  const res = await api.post(`/material-requisitions/${id}/convert-to-rfq`);
  return res.data;
}

export async function getRequisitionQuotations(id) {
  const res = await api.get(`/material-requisitions/${id}/quotations`);
  return res.data;
}

export async function acceptRequisitionQuotation(id, quotationId) {
  const res = await api.post(`/material-requisitions/${id}/quotations/${quotationId}/accept`);
  return res.data;
}
export async function rejectRequisitionQuotation(id, quotationId) {
  const res = await api.post(`/material-requisitions/${id}/quotations/${quotationId}/reject`);
  return res.data;
}

export async function requestQuotationCorrection(id, quotationId, note) {
  const res = await api.post(`/material-requisitions/${id}/quotations/${quotationId}/request-correction`, { note });
  return res.data;
}