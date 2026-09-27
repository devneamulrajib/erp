import portalApi from './portalAxios';
import { disconnectPortalSocket } from './portalSocket';

export async function portalLogin(email, password) {
  const res = await portalApi.post('/auth/login', { email, password });
  localStorage.setItem('portalToken', res.data.token);
  localStorage.setItem('portalUser', JSON.stringify(res.data.user));
  return res.data.user;
}

export function portalLogout() {
  disconnectPortalSocket();
  localStorage.removeItem('portalToken');
  localStorage.removeItem('portalUser');
}

export function getPortalUser() {
  const raw = localStorage.getItem('portalUser');
  return raw ? JSON.parse(raw) : null;
}

export async function forgotPassword(email) {
  const res = await portalApi.post('/auth/forgot-password', { email });
  return res.data;
}

export async function resetPassword(token, newPassword) {
  const res = await portalApi.post('/auth/reset-password', { token, newPassword });
  return res.data;
}