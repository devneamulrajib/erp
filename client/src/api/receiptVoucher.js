import api from './axios';

export async function getReceiptVouchers(params = {}) {
  const res = await api.get('/receipt-vouchers', { params });
  return res.data;
}
export async function getReceiptVoucher(id) {
  const res = await api.get(`/receipt-vouchers/${id}`);
  return res.data;
}
export async function getNextReceiptVoucherCode() {
  const res = await api.get('/receipt-vouchers/next-code');
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

export async function createReceiptVoucher(payload) {
  const res = await api.post('/receipt-vouchers', buildFormData(payload), {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}
export async function updateReceiptVoucher(id, payload) {
  const res = await api.put(`/receipt-vouchers/${id}`, buildFormData(payload), {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}
export async function deleteReceiptVoucher(id) {
  const res = await api.delete(`/receipt-vouchers/${id}`);
  return res.data;
}
export async function duplicateReceiptVoucher(id) {
  const res = await api.post(`/receipt-vouchers/${id}/duplicate`);
  return res.data;
}