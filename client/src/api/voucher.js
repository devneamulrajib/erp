import api from './axios';

export const getVouchers = (params) => api.get('/vouchers', { params });
export const getVoucher = (id) => api.get(`/vouchers/${id}`);
export const getNextVoucherCode = (type) => api.get('/vouchers/next-code', { params: { type } });
export const deleteVoucher = (id) => api.delete(`/vouchers/${id}`);
export const getBankReconciliation = (params) => api.get('/vouchers/bank-reconciliation', { params });
export const updateReconciliationStatus = (id, status) => api.patch(`/vouchers/${id}/reconciliation-status`, { status });

function buildVoucherFormData(payload) {
  const fd = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (key === 'attachmentFile') {
      if (value) fd.append('attachment', value);
    } else if (key === 'entries') {
      fd.append('entries', JSON.stringify(value || []));
    } else if (value !== undefined && value !== null) {
      fd.append(key, value);
    }
  });
  return fd;
}

export const createVoucher = (payload) => api.post('/vouchers', buildVoucherFormData(payload), {
  headers: { 'Content-Type': 'multipart/form-data' },
});
export const updateVoucher = (id, payload) => api.put(`/vouchers/${id}`, buildVoucherFormData(payload), {
  headers: { 'Content-Type': 'multipart/form-data' },
});