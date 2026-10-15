require('dotenv').config();
require('./models/associations');
const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const sequelize = require('./config/db');
const createSuperAdmin = require('./seed/createSuperAdmin');
const { init: initSocket } = require('./utils/socket');

const app = express();

// ==========================================
// Middleware Configuration
// ==========================================
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static Assets
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ==========================================
// HTTP Server & Socket.IO Setup
// ==========================================
const server = http.createServer(app);
initSocket(server);

// ==========================================
// Database Connection & Initialization
// ==========================================
sequelize.authenticate()
  .then(async () => {
    console.log('MySQL connected successfully.');
    // Verifies models match the DB structure without dropping tables
    await sequelize.sync(); 
    await createSuperAdmin();
  })
  .catch((err) => {
    console.error('MySQL connection error:', err);
  });

// ==========================================
// Core & Authentication Routes
// ==========================================
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/activity-log', require('./routes/activityLog'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/approvals', require('./routes/approvals'));

// ==========================================
// Project, Real Estate & CRM Routes
// ==========================================
app.use('/api/project-types', require('./routes/projectType'));
app.use('/api/projects', require('./routes/project'));
app.use('/api/project-managers', require('./routes/projectManager'));
app.use('/api/sites', require('./routes/site'));
app.use('/api/flats', require('./routes/flat'));
app.use('/api/flat-sales', require('./routes/flatSale'));
app.use('/api/agreements', require('./routes/agreement'));
app.use('/api/sales', require('./routes/sale'));
app.use('/api/quote', require('./routes/quote'));
app.use('/api/customers', require('./routes/customer'));
app.use('/api/leads', require('./routes/lead'));
app.use('/api/lead-category', require('./routes/leadCategory'));
app.use('/api/lead-source', require('./routes/leadSource'));
app.use('/api/lead-stage', require('./routes/leadStage'));
app.use('/api/offer', require('./routes/offer'));
app.use('/api/campaign', require('./routes/campaign'));
app.use('/api/communication-status', require('./routes/communicationStatus'));
app.use('/api/profession', require('./routes/profession'));
app.use('/api/area', require('./routes/area'));

// ==========================================
// Inventory, Items & Procurement Routes
// ==========================================
app.use('/api/category', require('./routes/category'));
app.use('/api/brand', require('./routes/brand'));
app.use('/api/unit', require('./routes/unit'));
app.use('/api/item', require('./routes/item'));
app.use('/api/bill-items', require('./routes/billItem'));
app.use('/api/service-items', require('./routes/serviceItem'));
app.use('/api/boq-titles', require('./routes/boqTitle'));
app.use('/api/assets', require('./routes/asset'));
app.use('/api/purchase', require('./routes/purchase'));
app.use('/api/purchase-order', require('./routes/purchaseOrder'));
app.use('/api/material-usage', require('./routes/materialUsage'));
app.use('/api/stock-transfer', require('./routes/stockTransfer'));
app.use('/api/material-requisitions', require('./routes/materialRequisition'));
app.use('/api/service-requisitions', require('./routes/serviceRequisition'));
app.use('/api/fund-requisitions', require('./routes/fundRequisition'));

// ==========================================
// Billing, Contracting & Accounting Routes
// ==========================================
app.use('/api/party', require('./routes/party'));
app.use('/api/party-list', require('./routes/partyList'));
app.use('/api/bill', require('./routes/bill'));
app.use('/api/period-bill', require('./routes/periodBill'));
app.use('/api/adjustment-bill', require('./routes/adjustmentBill'));
app.use('/api/labour-bill', require('./routes/labourBill'));
app.use('/api/contractor-bill', require('./routes/contractorBill'));
app.use('/api/contractor-bill-report', require('./routes/contractorBillReport'));
app.use('/api/workorder', require('./routes/workorder'));
app.use('/api/contractor-workorder', require('./routes/contractorWorkorder'));
app.use('/api/chart-of-group', require('./routes/chartOfGroup'));
app.use('/api/chart-of-accounts', require('./routes/chartOfAccounts'));
app.use('/api/expenses', require('./routes/expense'));
app.use('/api/office-expenses', require('./routes/officeExpense'));
app.use('/api/budget-categories', require('./routes/budgetCategory'));
app.use('/api/monthly-budgets', require('./routes/monthlyBudget'));
app.use('/api/bank-accounts', require('./routes/bankAccount'));
app.use('/api/vouchers', require('./routes/voucher'));
app.use('/api/journal-vouchers', require('./routes/journalVoucher'));
app.use('/api/contra-vouchers', require('./routes/contraVoucher'));
app.use('/api/accounting-reports', require('./routes/accountingReports'));

// ==========================================
// HR, Payroll & Investor Management Routes
// ==========================================
app.use('/api/employee', require('./routes/employee'));
app.use('/api/payslip', require('./routes/paySlip'));
app.use('/api/attendance-corrections', require('./routes/attendanceCorrection'));
app.use('/api/assign-share', require('./routes/assignShare'));
app.use('/api/investor-management', require('./routes/investor'));

// ==========================================
// Client / Partner / Employee Portal Routes
// ==========================================
// Authentication & Administration
app.use('/api/portal/auth', require('./routes/portalAuth'));
app.use('/api/portalAuth', require('./routes/portalAuth')); // Alias compatibility
app.use('/api/portal-admin', require('./routes/portalAdmin'));

// Portal Feature Modules
app.use('/api/portal/dashboard', require('./routes/portalDashboard'));
app.use('/api/portal/bills', require('./routes/portalBills'));
app.use('/api/portal/quotes', require('./routes/portalQuotes'));
app.use('/api/portal/purchase-orders', require('./routes/portalPurchaseOrders'));
app.use('/api/portal/material-requisitions', require('./routes/portalMaterialRequisitions'));
app.use('/api/portal/requests', require('./routes/portalRequests'));
app.use('/api/portal/employee', require('./routes/portalEmployee'));
app.use('/api/portal/investor', require('./routes/portalInvestor'));
app.use('/api/portal/notifications', require('./routes/portalNotifications'));

// ==========================================
// 404 & Global Error Handling
// ==========================================
app.use((req, res, next) => {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
});

app.use((err, req, res, next) => {
  console.error('Unhandled Application Error:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ==========================================
// Start Server
// ==========================================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});