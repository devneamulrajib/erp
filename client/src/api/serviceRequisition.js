import api from './axios';

export async function getServiceRequisitions(params = {}) {
  const res = await api.get('/service-requisitions', { params });
  return res.data;
}

export async function getServiceRequisition(id) {
  const res = await api.get(`/service-requisitions/${id}`);
  return res.data;
}

export async function createServiceRequisition(payload) {
  const res = await api.post('/service-requisitions', payload);
  return res.data;
}

export async function updateServiceRequisition(id, payload) {
  const res = await api.put(`/service-requisitions/${id}`, payload);
  return res.data;
}

export async function deleteServiceRequisition(id) {
  const res = await api.delete(`/service-requisitions/${id}`);
  return res.data;
}

export async function getNextServiceRequisitionCode() {
  const res = await api.get('/service-requisitions/next-code');
  return res.data;
}