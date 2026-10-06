// client/src/api/approvals.js
import axios from './axios';

export const getApprovalRequests = async (params = {}) => {
  // Uses /approvals so axios baseURL (/api) produces /api/approvals correctly
  const res = await axios.get('/approvals', { params });
  return res.data;
};

export const submitApprovalAction = async (payload) => {
  const res = await axios.post('/approvals/action', payload);
  return res.data;
};

export const getAccountantMetrics = async () => {
  const res = await axios.get('/approvals/accountant-metrics');
  return res.data;
};