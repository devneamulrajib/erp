import api from './axios';

export async function getQuotes(params = {}) {
  const res = await api.get('/quote', { params });
  return res.data;
}
export async function getQuote(id) {
  const res = await api.get(`/quote/${id}`);
  return res.data;
}
export async function getNextQuoteCode() {
  const res = await api.get('/quote/next-code');
  return res.data.code;
}
export async function createQuote(payload) {
  const res = await api.post('/quote', payload);
  return res.data;
}
export async function updateQuote(id, payload) {
  const res = await api.put(`/quote/${id}`, payload);
  return res.data;
}
export async function deleteQuote(id) {
  const res = await api.delete(`/quote/${id}`);
  return res.data;
}