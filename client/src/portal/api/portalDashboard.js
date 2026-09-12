import portalApi from './portalAxios';

export async function getPortalDashboard() {
  const res = await portalApi.get('/dashboard');
  return res.data;
}