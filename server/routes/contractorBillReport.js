const router = require('express').Router();
const auth = require('../middleware/auth');
const LabourBill = require('../models/LabourBill');

router.get('/', auth, async (req, res) => {
  try {
    const { from, to, project, party } = req.query;
    const filter = {};
    if (project) filter.project = project;
    if (party) filter.party = party;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = from;
      if (to) filter.date.$lte = to;
    }

    const bills = await LabourBill.find(filter)
      .populate('party', 'name')
      .populate('project', 'name')
      .sort({ date: -1 });

    const rows = [];
    bills.forEach((bill) => {
      (bill.items || []).forEach((item) => {
        rows.push({
          invoiceNo: bill.code,
          contractor: bill.party?.name || '',
          labourWorker: item.itemName || '',
          particulars: item.description || '',
          qtyDays: item.qtyDays || 0,
          unit: item.unit || '',
          rate: item.rate || 0,
          gross: item.gross || 0,
          securityDeposit: item.security || 0,
          paid: bill.paid || 0,
          due: bill.due || 0,
        });
      });
    });

    const totals = rows.reduce((acc, r) => ({
      gross: acc.gross + (Number(r.gross) || 0),
      securityDeposit: acc.securityDeposit + (Number(r.securityDeposit) || 0),
      paid: acc.paid + (Number(r.paid) || 0),
      due: acc.due + (Number(r.due) || 0),
    }), { gross: 0, securityDeposit: 0, paid: 0, due: 0 });

    res.json({ rows, totals });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;