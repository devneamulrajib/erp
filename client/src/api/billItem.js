import api from './axios';

export const getBillItems = (params) => api.get('/bill-items', { params });
export const getNextBillItemCode = () => api.get('/bill-items/next-code');
export const createBillItem = (data) => api.post('/bill-items', data);
export const updateBillItem = (id, data) => api.put(`/bill-items/${id}`, data);
export const deleteBillItem = (id) => api.delete(`/bill-items/${id}`);