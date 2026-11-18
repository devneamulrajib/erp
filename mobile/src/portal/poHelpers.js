// Shared purchase-order math (from PortalOrdersPage.jsx / PortalPurchaseOrderView.jsx).
export function billAmounts(o) {
  const total = Number(o?.bill?.grandTotal ?? o?.grandTotal) || 0;
  const paid = Number(o?.bill?.paid) || 0;
  const due = o?.bill ? Math.max(o.bill.due !== undefined && o.bill.due !== null ? Number(o.bill.due) || 0 : total - paid, 0) : total;
  let state = 'Unpaid';
  if (o?.bill && total > 0 && due <= 0) state = 'Paid';
  else if (paid > 0) state = 'Partial';
  else if (o?.paymentStatus === 'Paid') state = 'Paid';
  return { total, paid, due, state };
}

export function poActions(o) {
  return {
    needsAck: o.status === 'Submitted' || o.status === 'Sent to Supplier',
    canShip: o.status === 'Acknowledged' && o.deliveryStatus === 'Pending',
    canDeliver: o.status === 'Acknowledged' && o.deliveryStatus === 'Shipped',
    hasInvoice: !!o.convertedToBillId,
    canConfirmPayment: o.paymentStatus === 'Paid' && !o.supplierPaymentConfirmedAt,
  };
}

export const DELIVERY_STEPS = ['Pending', 'Shipped', 'Delivered'];
