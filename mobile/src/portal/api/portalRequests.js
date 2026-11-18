import portalApi from './portalAxios';

export async function getPortalRequests() {
  const res = await portalApi.get('/requests');
  return res.data;
}
export async function getPortalRequest(id) {
  const res = await portalApi.get(`/requests/${id}`);
  return res.data;
}
export async function createPortalRequest(subject, details) {
  const res = await portalApi.post('/requests', { subject, details });
  return res.data;
}