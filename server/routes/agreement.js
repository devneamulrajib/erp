const router = require('express').Router();
const auth = require('../middleware/auth');
const sequelize = require('../config/db');
const { Agreement, AgreementParty, AgreementPayment } = require('../models/associations');

const includes = [
  { model: AgreementParty, as: 'parties' },
  { model: AgreementPayment, as: 'payments' },
];

router.get('/', auth, async (req, res) => {
  try {
    const agreements = await Agreement.findAll({ include: includes, order: [['createdAt', 'DESC']] });
    res.json(agreements);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const item = await Agreement.findByPk(req.params.id, { include: includes });
    if (!item) return res.status(404).json({ message: 'Not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', auth, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { date, project, reference, title, termsConditions, footer, parties, payments } = req.body;

    const agreement = await Agreement.create({
      date: date || '', project: project || '', reference: reference || '', title: title || '',
      termsConditions: termsConditions || '', footer: footer || '',
    }, { transaction: t });

    if (Array.isArray(parties) && parties.length) {
      await AgreementParty.bulkCreate(parties.map((p) => ({ ...p, agreementId: agreement.id })), { transaction: t });
    }
    if (Array.isArray(payments) && payments.length) {
      await AgreementPayment.bulkCreate(payments.map((p) => ({ ...p, agreementId: agreement.id })), { transaction: t });
    }

    await t.commit();
    const populated = await Agreement.findByPk(agreement.id, { include: includes });
    res.status(201).json(populated);
  } catch (err) {
    await t.rollback();
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', auth, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const agreement = await Agreement.findByPk(req.params.id, { transaction: t });
    if (!agreement) {
      await t.rollback();
      return res.status(404).json({ message: 'Not found' });
    }

    const fields = ['date', 'project', 'reference', 'title', 'termsConditions', 'footer'];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) agreement[f] = req.body[f];
    });

    if (req.body.parties !== undefined) {
      await AgreementParty.destroy({ where: { agreementId: agreement.id }, transaction: t });
      if (req.body.parties.length) {
        await AgreementParty.bulkCreate(req.body.parties.map((p) => ({ ...p, agreementId: agreement.id })), { transaction: t });
      }
    }
    if (req.body.payments !== undefined) {
      await AgreementPayment.destroy({ where: { agreementId: agreement.id }, transaction: t });
      if (req.body.payments.length) {
        await AgreementPayment.bulkCreate(req.body.payments.map((p) => ({ ...p, agreementId: agreement.id })), { transaction: t });
      }
    }

    await agreement.save({ transaction: t });
    await t.commit();
    const populated = await Agreement.findByPk(agreement.id, { include: includes });
    res.json(populated);
  } catch (err) {
    await t.rollback();
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const deleted = await Agreement.destroy({ where: { id: req.params.id } });
    if (!deleted) return res.status(404).json({ message: 'Not found' });
    res.json({ deleted: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/duplicate', auth, async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const original = await Agreement.findByPk(req.params.id, { include: includes, transaction: t });
    if (!original) {
      await t.rollback();
      return res.status(404).json({ message: 'Not found' });
    }

    const copy = await Agreement.create({
      date: original.date, project: original.project, reference: original.reference,
      title: original.title, termsConditions: original.termsConditions, footer: original.footer,
    }, { transaction: t });

    if (original.parties?.length) {
      await AgreementParty.bulkCreate(
        original.parties.map((p) => ({ role: p.role, name: p.name, address: p.address, phone: p.phone, nid: p.nid, agreementId: copy.id })),
        { transaction: t },
      );
    }
    if (original.payments?.length) {
      await AgreementPayment.bulkCreate(
        original.payments.map((p) => ({ particulars: p.particulars, amount: p.amount, dueDate: p.dueDate, agreementId: copy.id })),
        { transaction: t },
      );
    }

    await t.commit();
    const populated = await Agreement.findByPk(copy.id, { include: includes });
    res.status(201).json(populated);
  } catch (err) {
    await t.rollback();
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;