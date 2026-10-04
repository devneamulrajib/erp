// client/src/api/monthlyBudget.js
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

// Cash Inflow / Installment Receipts API
export async function getCashReceipts(year, month) {
  const res = await api.get('/monthly-budgets/cash-receipts', { params: { year, month } });
  return res.data;
}

export async function saveCashReceipt(payload) {
  if (payload.id) {
    const res = await api.put(`/monthly-budgets/cash-receipts/${payload.id}`, payload);
    return res.data;
  }
  const res = await api.post('/monthly-budgets/cash-receipts', payload);
  return res.data;
}

export async function deleteCashReceipt(id) {
  const res = await api.delete(`/monthly-budgets/cash-receipts/${id}`);
  return res.data;
}