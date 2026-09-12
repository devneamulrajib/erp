import portalApi from './portalAxios';

export async function getPortalBills(params = {}) {
  const res = await portalApi.get('/bills', { params });
  return res.data;
}
export async function getPortalBill(id) {
  const res = await portalApi.get(`/bills/${id}`);
  return res.data;
}
export async function downloadPortalBillPdf(id, filename) {
  const res = await portalApi.get(`/bills/${id}/pdf`, { responseType: 'blob' });
  const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `Invoice-${id}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}