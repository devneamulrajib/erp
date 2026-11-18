import portalApi from './portalAxios';
import { disconnectPortalSocket } from './portalSocket';
import { setItem, removeItem, getJSON } from '../../storage/tokenStore';

// POST /api/portal/auth/login -> { token, user: { id, role, username, name, email } }
// One endpoint for every portal role (customer, supplier, vendor, employee, investor).
export async function portalLogin(email, password) {
  const res = await portalApi.post('/auth/login', { email, password });
  await setItem('portalToken', res.data.token);
  await setItem('portalUser', JSON.stringify(res.data.user));
  return res.data.user;
}

export async function portalLogout() {
  disconnectPortalSocket();
  await removeItem('portalToken');
  await removeItem('portalUser');
}

export function getPortalUser() {
  return getJSON('portalUser');
}

export async function getPortalMe() {
  const res = await portalApi.get('/auth/me');
  return res.data;
}
