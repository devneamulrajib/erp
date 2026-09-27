import api from './axios';

export async function getOfficeExpenses(params = {}) {
  const res = await api.get('/office-expenses', { params });
  return res.data;
}
export async function getOfficeExpense(id) {
  const res = await api.get(`/office-expenses/${id}`);
  return res.data;
}
export async function getNextOfficeExpenseCode() {
  const res = await api.get('/office-expenses/next-code');
  return res.data.code;
}
export async function createOfficeExpense({ attachmentFile, ...fields }) {
  const fd = new FormData();
  Object.entries(fields).forEach(([k, v]) => fd.append(k, v ?? ''));
  if (attachmentFile) fd.append('attachment', attachmentFile);
  const res = await api.post('/office-expenses', fd);
  return res.data;
}
export async function updateOfficeExpense(id, { attachmentFile, ...fields }) {
  const fd = new FormData();
  Object.entries(fields).forEach(([k, v]) => fd.append(k, v ?? ''));
  if (attachmentFile) fd.append('attachment', attachmentFile);
  const res = await api.put(`/office-expenses/${id}`, fd);
  return res.data;
}
export async function deleteOfficeExpense(id) {
  const res = await api.delete(`/office-expenses/${id}`);
  return res.data;
}
export async function getOfficeExpenseReport(year) {
  const res = await api.get('/office-expenses/report', { params: { year } });
  return res.data;
}