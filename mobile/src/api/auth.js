import api from './axios';
import { setItem, removeItem, getJSON } from '../storage/tokenStore';

// POST /api/auth/login  -> { token, user: { id, name, email, role } }
export async function staffLogin(email, password) {
  const { data } = await api.post('/auth/login', { email, password });
  await setItem('token', data.token);
  await setItem('user', JSON.stringify(data.user));
  return data.user;
}

export async function staffLogout() {
  await removeItem('token');
  await removeItem('user');
}

export function getStaffUser() {
  return getJSON('user');
}
