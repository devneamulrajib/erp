import api from './axios';

// Deposit & Withdrawal (server/routes/depositWithdrawal.js)
export const getDepositWithdrawalOptions = () => api.get('/deposit-withdrawals/options').then((res) => res.data);
export const getDepositWithdrawalSummary = (params) => api.get('/deposit-withdrawals/summary', { params }).then((res) => res.data);
export const getDepositWithdrawals = (params) => api.get('/deposit-withdrawals', { params }).then((res) => res.data);
export const getDepositWithdrawal = (id) => api.get(`/deposit-withdrawals/${id}`).then((res) => res.data);
export const getNextDepositWithdrawalCode = (kind) =>
  api.get('/deposit-withdrawals/next-code', { params: { kind } }).then((res) => res.data);

export const createDepositWithdrawal = (payload) => {
  const fd = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (key === 'attachmentFile') {
      if (value) fd.append('attachment', value);
    } else if (value !== undefined && value !== null && value !== '') {
      fd.append(key, value);
    }
  });
  return api.post('/deposit-withdrawals', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then((res) => res.data);
};
