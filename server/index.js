require('dotenv').config();
require('./models/associations');
const express = require('express');
const cors = require('cors');
const sequelize = require('./config/db');
const createSuperAdmin = require('./seed/createSuperAdmin');

const app = express();
app.use(cors());
app.use(express.json());

sequelize.authenticate()
  .then(async () => {
    console.log('MySQL connected');
    await sequelize.sync(); // creates tables that don't exist yet
    await createSuperAdmin();
  })
  .catch((err) => console.error('MySQL connection error:', err));

app.use('/api/auth', require('./routes/auth'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/project-types', require('./routes/projectType'));
app.use('/api/projects', require('./routes/project'));
app.use('/api/agreements', require('./routes/agreement'));
app.use('/api/sites', require('./routes/site'));
app.use('/api/flats', require('./routes/flat'));
app.use('/api/customers', require('./routes/customer'));
app.use('/api/flat-sales', require('./routes/flatSale'));
app.use('/api/category', require('./routes/category'));
app.use('/api/brand', require('./routes/brand'));
app.use('/api/unit', require('./routes/unit'));
app.use('/api/item', require('./routes/item'));
app.use('/api/purchase', require('./routes/purchase'));
app.use('/api/material-usage', require('./routes/materialUsage'));
app.use('/api/stock-transfer', require('./routes/stockTransfer'));
app.use('/api/purchase-order', require('./routes/purchaseOrder'));
app.use('/api/communication-status', require('./routes/communicationStatus'));
app.use('/api/lead-category', require('./routes/leadCategory'));
app.use('/api/profession', require('./routes/profession'));
app.use('/api/area', require('./routes/area'));
app.use('/api/lead-source', require('./routes/leadSource'));
app.use('/api/offer', require('./routes/offer'));
app.use('/api/lead-stage', require('./routes/leadStage'));
app.use('/api/campaign', require('./routes/campaign'));
app.use('/api/users', require('./routes/user'));
app.use('/api/chart-of-group', require('./routes/chartOfGroup'));
app.use('/api/chart-of-accounts', require('./routes/chartOfAccounts'));
app.use('/api/leads', require('./routes/lead'));
app.use('/api/categories', require('./routes/category'));
app.use('/api/bill-items', require('./routes/billItem'));
app.use('/api/service-items', require('./routes/serviceItem'));
app.use('/api/boq-titles', require('./routes/boqTitle'));
app.use('/api/assets', require('./routes/asset'));
app.use('/api/material-requisitions', require('./routes/materialRequisition'));
app.use('/api/service-requisitions', require('./routes/serviceRequisition'));
app.use('/api/fund-requisitions', require('./routes/fundRequisition'));
app.use('/uploads', require('express').static(require('path').join(__dirname, 'uploads')));
app.use('/api/bill', require('./routes/bill'));
app.use('/api/party', require('./routes/party'));
app.use('/api/labour-bill', require('./routes/labourBill'));
app.use('/api/workorder', require('./routes/workorder'));
app.use('/api/contractor-workorder', require('./routes/contractorWorkorder'));
app.use('/api/period-bill', require('./routes/periodBill'));
app.use('/api/adjustment-bill', require('./routes/adjustmentBill'));
app.use('/api/expenses', require('./routes/expense'));
app.use('/api/receipt-vouchers', require('./routes/receiptVoucher'));
app.use('/api/accounting-reports', require('./routes/accountingReports'));
app.use('/api/sales', require('./routes/sale'));
app.use('/api/quote', require('./routes/quote'));
app.use('/api/payment-vouchers', require('./routes/paymentVoucher'));
app.use('/api/journal-vouchers', require('./routes/journalVoucher'));
app.use('/api/contra-vouchers', require('./routes/contraVoucher'));
app.use('/api/contractor-bill-report', require('./routes/contractorBillReport'));
app.use('/api/contractor-bill', require('./routes/contractorBill'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));