import portalAxios from './portalAxios';

export const getInvestorSummary = () => portalAxios.get('/investor/summary');
export const getInvestorAllocation = () => portalAxios.get('/investor/allocation');
export const getInvestorInvestments = (params) => portalAxios.get('/investor/investments', { params });
export const getInvestorInvestmentDetail = (id) => portalAxios.get(`/investor/investments/${id}`);
export const getInvestorPayments = () => portalAxios.get('/investor/payments');
export const getInvestorSchedule = () => portalAxios.get('/investor/schedule');
export const getInvestorHistory = (params) => portalAxios.get('/investor/history', { params });
export const getInvestorCompare = (params) => portalAxios.get('/investor/compare', { params });
export const getInvestorProfile = () => portalAxios.get('/investor/profile');
export const changeInvestorPassword = (data) => portalAxios.post('/investor/change-password', data);

// --- Inbox ---
export const getInboxSummary = () => portalAxios.get('/investor/inbox/summary');
export const getInboxMessages = () => portalAxios.get('/investor/inbox/messages');
export const sendInboxMessage = (data) => portalAxios.post('/investor/inbox/messages', data);
export const markInboxRead = () => portalAxios.post('/investor/inbox/messages/read');
export const getInboxDocuments = () => portalAxios.get('/investor/inbox/documents');
export const downloadInboxDocument = (id) =>
  portalAxios.get(`/investor/inbox/documents/${id}/file`, { responseType: 'blob' });
export const getInboxNotes = () => portalAxios.get('/investor/inbox/notes');
export const getInboxActivity = () => portalAxios.get('/investor/inbox/activity');