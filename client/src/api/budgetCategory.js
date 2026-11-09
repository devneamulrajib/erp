import api from './axios';

export async function getBudgetCategories() {
  const res = await api.get('/budget-categories');
  return res.data;
}
export async function createBudgetCategory(payload) {
  const res = await api.post('/budget-categories', payload);
  return res.data;
}
export async function updateBudgetCategory(id, payload) {
  const res = await api.put(`/budget-categories/${id}`, payload);
  return res.data;
}
export async function deleteBudgetCategory(id) {
  const res = await api.delete(`/budget-categories/${id}`);
  return res.data;
}

// Credit-side defaults: { cashAccount, bankAccount, chequeAccount }
export async function getAccountDefaults() {
  const res = await api.get('/budget-categories/account-defaults');
  return res.data;
}
export async function saveAccountDefaults(payload) {
  const res = await api.put('/budget-categories/account-defaults', payload);
  return res.data;
}