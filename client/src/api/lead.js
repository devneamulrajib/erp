import api from './axios';

export const getLeads = () => api.get('/leads');
export const getNextLeadCode = () => api.get('/leads/next-code');
export const createLead = (data) => api.post('/leads', data);
export const updateLead = (id, data) => api.put(`/leads/${id}`, data);
export const deleteLead = (id) => api.delete(`/leads/${id}`);
export const bulkDeleteLeads = (ids) => api.post('/leads/bulk-delete', { ids });
export const callAssignLeads = (payload) => api.post('/leads/call-assign', payload);
export const transferLeads = (payload) => api.post('/leads/transfer', payload);
export const sendLeadSms = (ids, message) => api.post('/leads/send-sms', { ids, message });
export const sendWishSms = (ids) => api.post('/leads/wish-sms', { ids });
export const convertLeadToCustomer = (id, nid) => api.post(`/leads/${id}/convert-to-customer`, { nid });
export const bulkImportLeads = (formData) => api.post('/leads/bulk-import', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
});

// ============ Lead Detail Modal (tabs) ============

// Full single lead (populated with requirements.area, dealNegotiations.flat, assignedFlats, etc.)
export const getLead = (id) => api.get(`/leads/${id}`);

// Upcoming/Pending tab — stage / junk / sold / possibility
export const updateLeadStage = (id, data) => api.put(`/leads/${id}/stage`, data);

// Requirements tab
export const addRequirement = (leadId, data) => api.post(`/leads/${leadId}/requirements`, data);
export const deleteRequirement = (leadId, reqId) => api.delete(`/leads/${leadId}/requirements/${reqId}`);

// Deal Negotiation tab
export const addDealNegotiation = (leadId, data) => api.post(`/leads/${leadId}/deal-negotiations`, data);
export const updateDealNegotiation = (leadId, dealId, data) => api.put(`/leads/${leadId}/deal-negotiations/${dealId}`, data);
export const deleteDealNegotiation = (leadId, dealId) => api.delete(`/leads/${leadId}/deal-negotiations/${dealId}`);

// Property tab — assign/unassign existing Flat docs
export const assignFlatToLead = (leadId, flatId) => api.post(`/leads/${leadId}/assign-flat`, { flatId });
export const unassignFlatFromLead = (leadId, flatId) => api.delete(`/leads/${leadId}/assign-flat/${flatId}`);

// Follow-up tab
export const addFollowUp = (leadId, data) => api.post(`/leads/${leadId}/follow-ups`, data);

// Visits tab
export const addVisit = (leadId, data) => api.post(`/leads/${leadId}/visits`, data);

// Note tab
export const addLeadNote = (leadId, data) => api.post(`/leads/${leadId}/notes`, data);
export const deleteLeadNote = (leadId, noteId) => api.delete(`/leads/${leadId}/notes/${noteId}`);

export const getAllFollowUps = () => api.get('/leads/follow-ups/all');
export const deleteFollowUpEntry = (leadId, followUpId) => api.delete(`/leads/${leadId}/follow-ups/${followUpId}`);