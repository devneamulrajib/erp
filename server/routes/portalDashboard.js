const router = require('express').Router();
const { Op } = require('sequelize');
const { portalAuth } = require('../middleware/portalAuth');
const {
  Bill, Quote, PurchaseOrder, MaterialRequisition, PortalRequest,
} = require('../models/associations');

// GET /api/portal/dashboard
// Returns only data belonging to the logged-in portal user's customerId.
router.get('/', portalAuth, async (req, res) => {
  try {
    const { customerId, role } = req.portalUser;

    if (role === 'customer') {
      const [bills, quotes, requests] = await Promise.all([
        Bill.findAll({ where: { customerId } }),
        Quote.findAll({ where: { customerId } }),
        PortalRequest.findAll({ where: { customerId } }),
      ]);

      const outstandingBalance = bills.reduce((sum, b) => sum + (b.due || 0), 0);
      const paidAmount = bills.reduce((sum, b) => sum + (b.paid || 0), 0);

      return res.json({
        role,
        cards: {
          totalOrders: bills.length,
          pendingRequests: requests.filter(r => r.status === 'Submitted' || r.status === 'Under Review').length,
          pendingQuotations: quotes.filter(q => q.status === 'Submitted' || q.status === 'Under Review').length,
          outstandingBalance,
          paidAmount,
          pendingPayments: bills.filter(b => (b.due || 0) > 0).length,
        },
        recentInvoices: bills.slice(-5).reverse(),
        recentRequests: requests.slice(-5).reverse(),
      });
    }

    // supplier / vendor
    const [purchaseOrders, materialRequisitions, requests] = await Promise.all([
      PurchaseOrder.findAll({ where: { supplierId: customerId } }),
      MaterialRequisition.findAll({ where: { supplierId: customerId } }),
      PortalRequest.findAll({ where: { customerId } }),
    ]);

    return res.json({
      role,
      cards: {
        totalOrders: purchaseOrders.length,
        pendingRequests: requests.filter(r => r.status === 'Submitted' || r.status === 'Under Review').length,
        pendingQuotations: purchaseOrders.filter(po => po.status === 'Submitted').length,
        outstandingBalance: 0, // wired up in Phase 2 once BillPayment ownership queries are added
        paidAmount: 0,
        pendingPayments: 0,
      },
      recentInvoices: [],
      recentRequests: requests.slice(-5).reverse(),
    });
  } catch (err) {
    console.error('Portal dashboard error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;