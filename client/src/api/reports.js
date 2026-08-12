import api from './axios';

// All endpoints live under the existing /projects router (server/routes/project.js),
// mounted the same way your other project routes are (e.g. /api/projects/next-code).

export async function getProjectSummaryReport(params = {}) {
  const res = await api.get('/projects/reports/project-summary', { params });
  return res.data;
}

export async function getProjectProgressReport(params = {}) {
  const res = await api.get('/projects/reports/project-progress', { params });
  return res.data;
}

export async function getProjectWiseIncomeStatement(params = {}) {
  const res = await api.get('/projects/reports/project-wise-income', { params });
  return res.data;
}

export async function getSiteWiseIncomeStatement(params = {}) {
  const res = await api.get('/projects/reports/site-wise-income', { params });
  return res.data;
}

export async function getAmountUsageReport(params = {}) {
  const res = await api.get('/projects/reports/amount-usage', { params });
  return res.data;
}