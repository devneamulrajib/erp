import api from './axios';

export const getVouchers = (params) => api.get('/vouchers', { params });
export const getVoucher = (id) => api.get(`/vouchers/${id}`);
export const getNextVoucherCode = (type) => api.get('/vouchers/next-code', { params: { type } });
export const createVoucher = (data) => api.post('/vouchers', data);
export const updateVoucher = (id, data) => api.put(`/vouchers/${id}`, data);
export const deleteVoucher = (id) => api.delete(`/vouchers/${id}`);
export const getBankReconciliation = (params) => api.get('/vouchers/bank-reconciliation', { params });
export const updateReconciliationStatus = (id, status) => api.patch(`/vouchers/${id}/reconciliation-status`, { status });