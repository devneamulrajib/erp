import api from './axios';

export async function getFlatSales(params = {}) {
  const res = await api.get('/flat-sales', { params });
  return res.data;
}

export async function getFlatSale(id) {
  const res = await api.get(`/flat-sales/${id}`);
  return res.data;
}

export async function getNextFlatSaleCode() {
  const res = await api.get('/flat-sales/next-code');
  return res.data.code;
}

export async function createFlatSale(payload) {
  const res = await api.post('/flat-sales', payload);
  return res.data;
}

export async function updateFlatSale(id, payload) {
  const res = await api.put(`/flat-sales/${id}`, payload);
  return res.data;
}

export async function deleteFlatSale(id) {
  const res = await api.delete(`/flat-sales/${id}`);
  return res.data;
}

export async function getInstallmentReport(params = {}) {
  const res = await api.get('/flat-sales/installment-report', { params });
  return res.data;
}

export async function payInstallment(saleId, installmentId, payload) {
  const res = await api.put(`/flat-sales/${saleId}/installments/${installmentId}/pay`, payload);
  return res.data;
}