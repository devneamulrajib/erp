import api from './axios';

export const getContacts = (contactType, params = {}) => api.get('/chart-of-accounts', {
  params: { ...params, contactType },
});

export const getNextContactCode = (contactType) => api.get('/chart-of-accounts/next-code', {
  params: { contactType },
});

export const createContact = (formData) => api.post('/chart-of-accounts', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
});

export const updateContact = (id, formData) => api.put(`/chart-of-accounts/${id}`, formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
});

export const deleteContact = (id) => api.delete(`/chart-of-accounts/${id}`);