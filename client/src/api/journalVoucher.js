import api from './axios';

export async function getJournalVouchers(params = {}) {
  const res = await api.get('/journal-vouchers', { params });
  return res.data;
}
export async function getJournalVoucher(id) {
  const res = await api.get(`/journal-vouchers/${id}`);
  return res.data;
}
export async function getNextJournalVoucherCode() {
  const res = await api.get('/journal-vouchers/next-code');
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

export async function createJournalVoucher(payload) {
  const res = await api.post('/journal-vouchers', buildFormData(payload), {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}
export async function updateJournalVoucher(id, payload) {
  const res = await api.put(`/journal-vouchers/${id}`, buildFormData(payload), {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}
export async function deleteJournalVoucher(id) {
  const res = await api.delete(`/journal-vouchers/${id}`);
  return res.data;
}
export async function duplicateJournalVoucher(id) {
  const res = await api.post(`/journal-vouchers/${id}/duplicate`);
  return res.data;
}