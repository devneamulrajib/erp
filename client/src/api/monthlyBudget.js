import api from './axios';

export async function getMonthlyBudgetSummary(year, month) {
  const res = await api.get('/monthly-budgets/summary', { params: { year, month } });
  return res.data;
}
export async function saveMonthlyBudget(payload) {
  const res = await api.post('/monthly-budgets', payload);
  return res.data;
}
export async function deleteMonthlyBudget(id, note) {
  const res = await api.delete(`/monthly-budgets/${id}`, { data: { note } });
  return res.data;
}
export async function getMonthlyBudgetLogs(budgetCategoryId, year, month) {
  const res = await api.get('/monthly-budgets/logs', { params: { budgetCategoryId, year, month } });
  return res.data;
}