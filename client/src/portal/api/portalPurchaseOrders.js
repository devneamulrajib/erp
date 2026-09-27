import portalApi from './portalAxios';

export async function getPortalPurchaseOrders(params = {}) {
  const res = await portalApi.get('/purchase-orders', { params });
  return res.data;
}
export async function getPortalPurchaseOrder(id) {
  const res = await portalApi.get(`/purchase-orders/${id}`);
  return res.data;
}
export async function getPortalSupplierInvoices() {
  const res = await portalApi.get('/purchase-orders/invoices/list');
  return res.data;
}
export async function confirmPurchaseOrder(id) {
  const res = await portalApi.patch(`/purchase-orders/${id}/acknowledge`);
  return res.data;
}
// Alias kept for compatibility with existing callers (e.g. PortalOrdersPage.jsx)
export const acknowledgePurchaseOrder = confirmPurchaseOrder;

export async function updateDeliveryStatus(id, status) {
  const res = await portalApi.patch(`/purchase-orders/${id}/delivery-status`, { status });
  return res.data;
}

export async function downloadInvoice(id) {
  const res = await portalApi.get(`/purchase-orders/${id}/invoice`, { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `invoice-${id}.pdf`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function confirmPaymentReceived(id) {
  const res = await portalApi.patch(`/purchase-orders/${id}/confirm-payment`);
  return res.data;
}