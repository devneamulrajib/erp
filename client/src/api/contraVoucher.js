import api from './axios';

export async function getContraVouchers(params = {}) {
  const res = await api.get('/contra-vouchers', { params });
  return res.data;
}
export async function getContraVoucher(id) {
  const res = await api.get(`/contra-vouchers/${id}`);
  return res.data;
}
export async function getNextContraVoucherCode() {
  const res = await api.get('/contra-vouchers/next-code');
  return res.data.code;
}

function buildFormData(payload) {
  const fd = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (key === 'lines') {
      fd.append('lines', JSON.stringify(value));
    } else if (key === 'attachmentFile') {
      if (value) fd.append('attachment', value);
    } else if (value !== undefined && value !== null) {
      fd.append(key, value);
    }
  });
  return fd;
}

export async function createContraVoucher(payload) {
  const res = await api.post('/contra-vouchers', buildFormData(payload), {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}
export async function updateContraVoucher(id, payload) {
  const res = await api.put(`/contra-vouchers/${id}`, buildFormData(payload), {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}
export async function deleteContraVoucher(id) {
  const res = await api.delete(`/contra-vouchers/${id}`);
  return res.data;
}
export async function duplicateContraVoucher(id) {
  const res = await api.post(`/contra-vouchers/${id}/duplicate`);
  return res.data;
}