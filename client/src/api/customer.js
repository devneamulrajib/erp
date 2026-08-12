import api from './axios';

export async function getCustomers(params = {}) {
  const res = await api.get('/customers', { params });
  return res.data;
}

export async function getCustomer(id) {
  const res = await api.get(`/customers/${id}`);
  return res.data;
}

export async function getNextCustomerCode() {
  const res = await api.get('/customers/next-code');
  return res.data.code;
}

export async function createCustomer(payload) {
  const res = await api.post('/customers', payload);
  return res.data;
}

export async function updateCustomer(id, payload) {
  const res = await api.put(`/customers/${id}`, payload);
  return res.data;
}

export async function deleteCustomer(id) {
  const res = await api.delete(`/customers/${id}`);
  return res.data;
}