import api from './axios';

export async function getParties(params = {}) {
  const res = await api.get('/party', { params });
  return res.data;
}
export async function getParty(id) {
  const res = await api.get(`/party/${id}`);
  return res.data;
}
export async function getNextPartyCode() {
  const res = await api.get('/party/next-code');
  return res.data.code;
}
export async function createParty(payload) {
  const res = await api.post('/party', payload);
  return res.data;
}
export async function updateParty(id, payload) {
  const res = await api.put(`/party/${id}`, payload);
  return res.data;
}
export async function deleteParty(id) {
  const res = await api.delete(`/party/${id}`);
  return res.data;
}