import portalApi from './portalAxios';
import { downloadAndShare } from '../../utils/download';

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

// Supplier earnings track record: totals, monthly breakdown, every payment received.
// params: { from: 'YYYY-MM-DD', to: 'YYYY-MM-DD' } (both optional, filter the payment list)
export async function getPortalEarnings(params = {}) {
  const res = await portalApi.get('/purchase-orders/earnings', { params });
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
  return downloadAndShare(`${portalApi.defaults.baseURL}/purchase-orders/${id}/invoice`, `invoice-${id}.pdf`);
}

export async function confirmPaymentReceived(id) {
  const res = await portalApi.patch(`/purchase-orders/${id}/confirm-payment`);
  return res.data;
}