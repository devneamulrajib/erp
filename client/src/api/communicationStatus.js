import api from './axios';

export const getCommunicationStatuses = (params) => api.get('/communication-status', { params });
export const createCommunicationStatus = (data) => api.post('/communication-status', data);
export const updateCommunicationStatus = (id, data) => api.put(`/communication-status/${id}`, data);
export const deleteCommunicationStatus = (id) => api.delete(`/communication-status/${id}`);