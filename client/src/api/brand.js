import api from './axios';

export async function getBrands(params) {
  const res = await api.get('/brand', { params });
  return res.data;
}
export async function getNextBrandCode() {
  const res = await api.get('/brand/next-code');
  return res.data;
}
export async function createBrand(data) {
  const res = await api.post('/brand', data);
  return res.data;
}
export async function updateBrand(id, data) {
  const res = await api.put(`/brand/${id}`, data);
  return res.data;
}
export async function deleteBrand(id) {
  const res = await api.delete(`/brand/${id}`);
  return res.data;
}