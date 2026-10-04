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
export async function unpayPaySlip(id) {
  const res = await api.post(`/payslip/${id}/unpay`);
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

function triggerDownload(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function downloadPaySlipPdf(slip) {
  const res = await api.get(`/payslip/${slip.id}/pdf`, { responseType: 'blob' });
  triggerDownload(res.data, `Payslip-${slip.employee?.code || slip.employeeId}-${slip.month}-${slip.year}.pdf`);
}

export async function downloadPayrollReportPdf(params) {
  const res = await api.get('/payslip/report/pdf', { params, responseType: 'blob' });
  triggerDownload(res.data, `Payroll-Report-${params.year || 'all'}-${params.month || 'all'}.pdf`);
}