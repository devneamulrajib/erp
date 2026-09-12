const router = require('express').Router();
const { Op } = require('sequelize');
const auth = require('../middleware/auth');
const LabourBill = require('../models/LabourBill');
const LabourBillItem = require('../models/LabourBillItem');
const Party = require('../models/Party');
const Project = require('../models/Project');

router.get('/', auth, async (req, res) => {
  try {
    const { from, to, project, party } = req.query;
    const where = {};
    if (project) where.projectId = project;
    if (party) where.partyId = party;
    if (from || to) {
      where.date = {};
      if (from) where.date[Op.gte] = from;
      if (to) where.date[Op.lte] = to;
    }

    const bills = await LabourBill.findAll({
      where,
      include: [
        { model: Party, as: 'party', attributes: ['name'] },
        { model: Project, as: 'project', attributes: ['name'] },
        { model: LabourBillItem },                     // default alias: LabourBillItems
      ],
      order: [['date', 'DESC']],
    });

    const rows = [];
    bills.forEach((bill) => {
      (bill.LabourBillItems || []).forEach((item) => {
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