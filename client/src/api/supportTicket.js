// client/src/api/supportTicket.js
import api from './axios';

// ---- Used by the Support modal ----
// data may be a plain object or FormData (when attaching files)
export const createSupportTicket = (data) =>
  api.post('/support-tickets', data).then((r) => r.data);

export const getMySupportTickets = () =>
  api.get('/support-tickets/mine').then((r) => r.data);

// ---- Old names, now pointed at the new routes ----
// Returns an array of tickets (the server now paginates; pass { pageSize: 100 } etc.)
export const getAllSupportTickets = (params = {}) =>
  api.get('/support-tickets', { params }).then((r) => r.data.items || []);

// Returns the full detail: { ticket, messages, events, attachments, links, transitions, can }
export const getSupportTicket = (id) =>
  api.get(`/support-tickets/${id}`).then((r) => r.data);

// Edits title / description / category / module / referenceNo / severity / dueAt
export const updateSupportTicket = (id, data) =>
  api.patch(`/support-tickets/${id}`, data).then((r) => r.data);

// ---- New endpoints ----
// Paginated list: returns { items, total, page, pageSize, totalPages }
export const listSupportTickets = (params = {}) =>
  api.get('/support-tickets', { params }).then((r) => r.data);

export const getSupportMeta = () =>
  api.get('/support-tickets/meta').then((r) => r.data);

export const getSupportSummary = () =>
  api.get('/support-tickets/summary').then((r) => r.data);

export const getSupportAnalytics = (days = 30) =>
  api.get('/support-tickets/analytics', { params: { days } }).then((r) => r.data);

export const exportSupportTickets = (params = {}) =>
  api.get('/support-tickets/export', { params, responseType: 'blob' }).then((r) => r.data);

export const getSlaRules = () =>
  api.get('/support-tickets/sla-rules').then((r) => r.data);

export const updateSlaRules = (rules) =>
  api.put('/support-tickets/sla-rules', { rules }).then((r) => r.data);

// action: 'assign' | 'status' | 'priority' | 'archive'
export const bulkSupportAction = ({ ids, action, value, note }) =>
  api.post('/support-tickets/bulk', { ids, action, value, note }).then((r) => r.data);

export const changeSupportTicketStatus = (id, status, note) =>
  api.post(`/support-tickets/${id}/status`, { status, note }).then((r) => r.data);

export const assignSupportTicket = (id, assigneeId) =>
  api.post(`/support-tickets/${id}/assign`, { assigneeId }).then((r) => r.data);

export const archiveSupportTicket = (id, note) =>
  api.post(`/support-tickets/${id}/archive`, { note }).then((r) => r.data);

export const restoreSupportTicket = (id) =>
  api.post(`/support-tickets/${id}/restore`).then((r) => r.data);

// formData fields: body, kind ('reply' | 'note'), files (up to 5)
export const addSupportMessage = (id, formData) =>
  api.post(`/support-tickets/${id}/messages`, formData).then((r) => r.data);

export const addSupportAttachments = (id, formData) =>
  api.post(`/support-tickets/${id}/attachments`, formData).then((r) => r.data);

export const downloadSupportAttachment = (id, attId, inline = false) =>
  api
    .get(`/support-tickets/${id}/attachments/${attId}`, {
      params: inline ? { inline: 1 } : undefined,
      responseType: 'blob',
    })
    .then((r) => r.data);

export const linkSupportTicket = (id, ticketNo) =>
  api.post(`/support-tickets/${id}/links`, { ticketNo }).then((r) => r.data);

export const unlinkSupportTicket = (id, linkId) =>
  api.delete(`/support-tickets/${id}/links/${linkId}`).then((r) => r.data);