import api from './axios';

export async function previewPaySlips(year, month) {
  const res = await api.get('/payslip/preview', { params: { year, month } });
  return res.data;
}
export async function generatePaySlips(year, month) {
  const res = await api.post('/payslip/generate', { year, month });
  return res.data;
}
export async function getPaySlips(params) {
  const res = await api.get('/payslip', { params });
  return res.data;
}
export async function getPaySlip(id) {
  const res = await api.get(`/payslip/${id}`);
  return res.data;
}
export async function payPaySlip(id, data) {
  const res = await api.post(`/payslip/${id}/pay`, data);
  return res.data;
}
export async function deletePaySlip(id) {
  const res = await api.delete(`/payslip/${id}`);
  return res.data;
}

export async function addSalaryDeduction(data) {
  const res = await api.post('/payslip/deductions', data);
  return res.data;
}
export async function getSalaryDeductions(params) {
  const res = await api.get('/payslip/deductions', { params });
  return res.data;
}
export async function deleteSalaryDeduction(id) {
  const res = await api.delete(`/payslip/deductions/${id}`);
  return res.data;
}