import api from './axios';

export const createSupportTicket = (data) =>
  api.post('/support-tickets', data).then((r) => r.data);

export const getMySupportTickets = () =>
  api.get('/support-tickets/mine').then((r) => r.data);

// Admin
export const getAllSupportTickets = () =>
  api.get('/support-tickets/admin/all').then((r) => r.data);

export const getSupportTicket = (id) =>
  api.get(`/support-tickets/admin/${id}`).then((r) => r.data);

export const updateSupportTicket = (id, data) =>
  api.patch(`/support-tickets/admin/${id}`, data).then((r) => r.data);