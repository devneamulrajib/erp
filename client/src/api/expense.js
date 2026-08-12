import api from './axios';

export async function getExpenses(params = {}) {
  const res = await api.get('/expenses', { params });
  return res.data;
}
export async function getExpense(id) {
  const res = await api.get(`/expenses/${id}`);
  return res.data;
}
export async function getNextExpenseCode() {
  const res = await api.get('/expenses/next-code');
  return res.data.code;
}

function buildFormData(payload) {
  const fd = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (key === 'attachmentFile') {
      if (value) fd.append('attachment', value);
    } else if (value !== undefined && value !== null) {
      fd.append(key, value);
    }
  });
  return fd;
}

export async function createExpense(payload) {
  const res = await api.post('/expenses', buildFormData(payload), {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}
export async function updateExpense(id, payload) {
  const res = await api.put(`/expenses/${id}`, buildFormData(payload), {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}
export async function deleteExpense(id) {
  const res = await api.delete(`/expenses/${id}`);
  return res.data;
}
export async function duplicateExpense(id) {
  const res = await api.post(`/expenses/${id}/duplicate`);
  return res.data;
}