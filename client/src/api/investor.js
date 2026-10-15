// client/src/api/investor.js
import axios from './axios';

export const getDashboardSummary = (params) =>
  axios.get('/investor-management/dashboard-summary', { params });

export const getInvestors = (params) =>
  axios.get('/investor-management/investors', { params });

export const createInvestor = (data) =>
  axios.post('/investor-management/investors', data);

export const updateInvestor = (id, data) =>
  axios.put(`/investor-management/investors/${id}`, data);

export const deleteInvestor = (id) =>
  axios.delete(`/investor-management/investors/${id}`);

// --- Investor photo ---
export const uploadInvestorPhoto = (investorId, formData) =>
  axios.post(`/investor-management/investors/${investorId}/photo`, formData);

export const deleteInvestorPhoto = (investorId) =>
  axios.delete(`/investor-management/investors/${investorId}/photo`);

export const getInvestorPhoto = (investorId) =>
  axios.get(`/investor-management/investors/${investorId}/photo`, { responseType: 'blob' });

export const getInvestments = (params) =>
  axios.get('/investor-management/investments', { params });

export const getInvestmentById = (id) =>
  axios.get(`/investor-management/investments/${id}`);

export const createInvestment = (data) =>
  axios.post('/investor-management/investments', data);

// --- Payouts (we pay the investor). Send FormData: investmentId, paymentDate,
// paymentType, principalPortion, notes, lines (JSON) and file_<index> attachments.
export const recordInvestorPayment = (formData) =>
  axios.post('/investor-management/payments', formData);

// --- Receipts (the investor pays us). Same FormData shape, minus the payout fields.
export const recordInvestmentReceipt = (investmentId, formData) =>
  axios.post(`/investor-management/investments/${investmentId}/receipts`, formData);

// Every receipt and payout (with its payment lines) for one investment / investor
export const getInvestmentMoney = (investmentId) =>
  axios.get(`/investor-management/investments/${investmentId}/money`);

export const getInvestorMoney = (investorId) =>
  axios.get(`/investor-management/investors/${investorId}/money`);

export const downloadPaymentAttachment = (lineId) =>
  axios.get(`/investor-management/payment-lines/${lineId}/file`, { responseType: 'blob' });

// --- Investor bank accounts ---
export const getInvestorBankAccounts = (investorId) =>
  axios.get(`/investor-management/investors/${investorId}/bank-accounts`);

export const createInvestorBankAccount = (investorId, data) =>
  axios.post(`/investor-management/investors/${investorId}/bank-accounts`, data);

export const updateInvestorBankAccount = (accountId, data) =>
  axios.put(`/investor-management/bank-accounts/${accountId}`, data);

export const deleteInvestorBankAccount = (accountId) =>
  axios.delete(`/investor-management/bank-accounts/${accountId}`);

// Our own bank accounts (for "paid from" / "received into")
export const getCompanyBanks = () => axios.get('/investor-management/company-banks');

// --- Documents ---
export const getInvestorDocuments = (investorId) =>
  axios.get(`/investor-management/investors/${investorId}/documents`);

export const uploadInvestorDocument = (investorId, formData) =>
  axios.post(`/investor-management/investors/${investorId}/documents`, formData);

export const updateInvestorDocument = (docId, data) =>
  axios.patch(`/investor-management/documents/${docId}`, data);

export const deleteInvestorDocument = (docId) =>
  axios.delete(`/investor-management/documents/${docId}`);

export const downloadInvestorDocument = (docId) =>
  axios.get(`/investor-management/documents/${docId}/file`, { responseType: 'blob' });

// --- Communication ---
export const getInvestorMessages = (investorId) =>
  axios.get(`/investor-management/investors/${investorId}/messages`);

export const sendInvestorMessage = (investorId, data) =>
  axios.post(`/investor-management/investors/${investorId}/messages`, data);

// --- Notes ---
export const getInvestorNotes = (investorId) =>
  axios.get(`/investor-management/investors/${investorId}/notes`);

export const createInvestorNote = (investorId, data) =>
  axios.post(`/investor-management/investors/${investorId}/notes`, data);

export const updateInvestorNote = (noteId, data) =>
  axios.patch(`/investor-management/notes/${noteId}`, data);

export const deleteInvestorNote = (noteId) =>
  axios.delete(`/investor-management/notes/${noteId}`);

// --- Activity log ---
export const getInvestorActivity = (investorId) =>
  axios.get(`/investor-management/investors/${investorId}/activity`);