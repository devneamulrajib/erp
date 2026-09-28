import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { findMenuItemByRoute } from './navConfig';

const APP_NAME = 'Trikon ERP';

// Pages that aren't in the nav menu (or where you want a different label).
const STATIC_TITLES = {
  '/login': 'Login',
  '/dashboard': 'Dashboard',
  '/portal/login': 'Portal Login',
  '/portal/dashboard': 'Portal Dashboard',
  '/portal/invoices': 'Invoices',
  '/portal/quotes': 'Quotes',
  '/portal/orders': 'Orders',
  '/portal/requests': 'Requests',
  '/portal/material-requisitions': 'Requisitions',
  '/portal/employee/leave': 'Leave Requests',
  '/portal/employee/advance': 'Advance Requests',
  '/billing/bill': 'Bill / Invoice',
  '/billing/contract_bill': 'Contractor Bill',
  '/billing/workorder': 'Work Order',
  '/billing/contractor-workorder': 'Contractor Work Order',
  '/billing/period-bill-add': 'Period Billing',
  '/billing/adjustment-bill': 'Adjustment Billing',
  '/billing/quote': 'Quote',
  '/billing/item-sale-create': 'Sale',
  '/inventory-module/purchase': 'Purchase',
  '/procurement-module/purchase-order': 'Purchase Order',
  '/inventory-module/materialusage': 'Material Usage',
  '/inventory-module/stock_adjustment': 'Stock Transfer',
};

const isIdSegment = (s) => /^\d+$/.test(s) || /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(s);

function humanize(segments) {
  const last = [...segments].reverse().find((s) => !isIdSegment(s)) || '';
  return last
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function resolveTitle(pathname) {
  const segments = pathname.split('/').filter(Boolean);

  // Try the full path, then drop trailing segments so that
  // /billing/bill/12 or /portal/orders/5 still resolve.
  for (let i = segments.length; i > 0; i--) {
    const path = '/' + segments.slice(0, i).join('/');
    if (STATIC_TITLES[path]) return STATIC_TITLES[path];
    const item = findMenuItemByRoute(path);
    if (item) return item.label;
  }
  return humanize(segments); // last-resort fallback
}

export default function TitleManager() {
  const { pathname } = useLocation();

  useEffect(() => {
    const title = resolveTitle(pathname);
    document.title = title ? `${title} | ${APP_NAME}` : APP_NAME;
  }, [pathname]);

  return null;
}