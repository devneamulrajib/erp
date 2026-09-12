import api from './axios';

export async function getBills(params = {}) {
  const res = await api.get('/bill', { params });
  return res.data;
}
export async function getBill(id) {
  const res = await api.get(`/bill/${id}`);
  return res.data;
}
export async function getNextBillCode() {
  const res = await api.get('/bill/next-code');
  return res.data.code;
}
export async function createBill(payload) {
  const res = await api.post('/bill', payload);
  return res.data;
}
export async function updateBill(id, payload) {
  const res = await api.put(`/bill/${id}`, payload);
  return res.data;
}
export async function deleteBill(id) {
  const res = await api.delete(`/bill/${id}`);
  return res.data;
}

export async function updateBillStatus(id, status) {
  const res = await api.patch(`/bill/${id}/status`, { status });
  return res.data;
}

export async function uploadBillAttachment(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await api.post('/bill/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data.url;
}

export async function downloadBillPdf(id, filename) {
  const res = await api.get(`/bill/${id}/pdf`, { responseType: 'blob' });
  const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `Invoice-${id}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function sendBillEmail(id, to) {
  const res = await api.post(`/bill/${id}/send-email`, { to });
  return res.data;
}

export function getBillAttachmentUrl(attachmentPath) {
  if (!attachmentPath) return '';
  if (/^https?:\/\//i.test(attachmentPath)) return attachmentPath;
  const base = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/api\/?$/, '');
  return `${base}${attachmentPath}`;
}