import portalApi from './portalAxios';
import { downloadAndShare } from '../../utils/download';

export async function getPortalBills(params = {}) {
  const res = await portalApi.get('/bills', { params });
  return res.data;
}
export async function getPortalBill(id) {
  const res = await portalApi.get(`/bills/${id}`);
  return res.data;
}
export async function downloadPortalBillPdf(id, filename) {
  return downloadAndShare(`${portalApi.defaults.baseURL}/bills/${id}/pdf`, filename || `Invoice-${id}.pdf`);
}