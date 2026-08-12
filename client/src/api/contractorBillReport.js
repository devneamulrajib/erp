import api from './axios';

export async function getContractorBillReport(params = {}) {
  const res = await api.get('/contractor-bill-report', { params });
  return res.data;
}