import api from './axios';

const BASE_URL = '/flats';

export async function getFlats(params = {}) {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null)
  ).toString();
  const res = await api.get(`${BASE_URL}${query ? `?${query}` : ''}`);
  return res.data;
}

export async function getNextFlatCode() {
  const res = await api.get(`${BASE_URL}/next-code`);
  return res.data;
}

export async function createFlat(payload) {
  const res = await api.post(BASE_URL, payload);
  return res.data;
}

export async function updateFlat(id, payload) {
  const res = await api.put(`${BASE_URL}/${id}`, payload);
  return res.data;
}

export async function deleteFlat(id) {
  const res = await api.delete(`${BASE_URL}/${id}`);
  return res.data;
}