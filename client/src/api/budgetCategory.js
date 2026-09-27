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