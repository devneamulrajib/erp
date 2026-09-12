import api from './axios';

export const getBankAccounts = (params) => api.get('/bank-accounts', { params }).then((res) => res.data);
export const getBankAccount = (id) => api.get(`/bank-accounts/${id}`).then((res) => res.data);
export const createBankAccount = (data) => api.post('/bank-accounts', data).then((res) => res.data);
export const updateBankAccount = (id, data) => api.put(`/bank-accounts/${id}`, data).then((res) => res.data);
export const deleteBankAccount = (id) => api.delete(`/bank-accounts/${id}`).then((res) => res.data);