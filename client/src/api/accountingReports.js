import api from './axios';

export const getDayBook = (params) => api.get('/accounting-reports/day-book', { params });
export const getContactLedgerSummary = (params) => api.get('/accounting-reports/contact-ledger-summary', { params });
export const getExpenseReport = (params) => api.get('/accounting-reports/expense-report', { params });
export const getReceivePaymentStatement = (params) => api.get('/accounting-reports/receive-payment-statement', { params });
export const getCashBankBooks = (params) => api.get('/accounting-reports/cash-bank-books', { params });
export const getIncomeStatement = (params) => api.get('/accounting-reports/income-statement', { params });
export const getCashFlowStatement = (params) => api.get('/accounting-reports/cash-flow-statement', { params });
export const getTrialBalance = (params) => api.get('/accounting-reports/trial-balance', { params });
export const getBalanceSheet = (params) => api.get('/accounting-reports/balance-sheet', { params });