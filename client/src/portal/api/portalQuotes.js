import portalApi from './portalAxios';

export async function getPortalQuotes(params = {}) {
  const res = await portalApi.get('/quotes', { params });
  return res.data;
}
export async function getPortalQuote(id) {
  const res = await portalApi.get(`/quotes/${id}`);
  return res.data;
}
export async function respondToQuote(id, decision) {
  const res = await portalApi.patch(`/quotes/${id}/respond`, { decision });
  return res.data;
}