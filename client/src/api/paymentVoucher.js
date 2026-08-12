import api from './axios';

export async function getPaymentVouchers(params = {}) {
  const res = await api.get('/payment-vouchers', { params });
  return res.data;
}
export async function getPaymentVoucher(id) {
  const res = await api.get(`/payment-vouchers/${id}`);
  return res.data;
}
export async function getNextPaymentVoucherCode() {
  const res = await api.get('/payment-vouchers/next-code');
  return res.data.code;
}

function buildFormData(payload) {
  const fd = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (key === 'attachmentFile') {
      if (value) fd.append('attachment', value);
    } else if (value !== undefined && value !== null) {
      fd.append(key, value);
    }
  });
  return fd;
}

export async function createPaymentVoucher(payload) {
  const res = await api.post('/payment-vouchers', buildFormData(payload), {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}
export async function updatePaymentVoucher(id, payload) {
  const res = await api.put(`/payment-vouchers/${id}`, buildFormData(payload), {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}
export async function deletePaymentVoucher(id) {
  const res = await api.delete(`/payment-vouchers/${id}`);
  return res.data;
}
export async function duplicatePaymentVoucher(id) {
  const res = await api.post(`/payment-vouchers/${id}/duplicate`);
  return res.data;
}