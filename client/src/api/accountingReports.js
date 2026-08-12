import api from './axios';

export const getDayBook = (params) => api.get('/accounting-reports/day-book', { params });
export const getContactLedgerSummary = (params) => api.get('/accounting-reports/contact-ledger-summary', { params });
export const getExpenseReport = (params) => api.get('/accounting-reports/expense-report', { params });
export const getReceivePaymentStatement = (params) => api.get('/accounting-reports/receive-payment-statement', { params });