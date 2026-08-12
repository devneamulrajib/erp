import api from './axios';

export const getOffers = (params) => api.get('/offer', { params });
export const createOffer = (data) => api.post('/offer', data);
export const updateOffer = (id, data) => api.put(`/offer/${id}`, data);
export const deleteOffer = (id) => api.delete(`/offer/${id}`);