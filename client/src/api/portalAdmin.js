import api from './axios';

// Body: { enable: boolean, portalRole?: 'customer'|'supplier'|'vendor', password?: string }
export async function setPortalAccess(customerId, { enable, portalRole, password }) {
  const res = await api.put(`/portal-admin/customers/${customerId}/access`, {
    enable,
    portalRole,
    password,
  });
  return res.data;
}