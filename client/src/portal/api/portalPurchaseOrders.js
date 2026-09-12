import portalApi from './portalAxios';

export async function getPortalPurchaseOrders(params = {}) {
  const res = await portalApi.get('/purchase-orders', { params });
  return res.data;
}
export async function getPortalPurchaseOrder(id) {
  const res = await portalApi.get(`/purchase-orders/${id}`);
  return res.data;
}
export async function acknowledgePurchaseOrder(id) {
  const res = await portalApi.patch(`/purchase-orders/${id}/acknowledge`);
  return res.data;
}