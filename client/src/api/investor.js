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

export const getInvestments = (params) =>
  axios.get('/investor-management/investments', { params });

export const getInvestmentById = (id) =>
  axios.get(`/investor-management/investments/${id}`);

export const createInvestment = (data) =>
  axios.post('/investor-management/investments', data);

export const recordInvestorPayment = (data) =>
  axios.post('/investor-management/payments', data);