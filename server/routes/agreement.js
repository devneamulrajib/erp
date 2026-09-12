const router = require('express').Router();
const auth = require('../middleware/auth');
const sequelize = require('../config/db');
const puppeteer = require('puppeteer');
const { Agreement, AgreementParty, AgreementPayment } = require('../models/associations');

const includes = [
  { model: AgreementParty, as: 'parties' },
  { model: AgreementPayment, as: 'payments' },
];

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(d) {
  if (!d) return 'N/A';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return escapeHtml(d);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatAmount(v) {
  const n = Number(v);
  if (Number.isNaN(n)) return '0.00';
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Builds the full printable HTML document for an agreement. termsConditions and
// footer are rich text saved from RichTextEditor, so they're trusted HTML and
// rendered as-is; every other field is plain text and gets escaped.
function buildAgreementHtml(agreement) {
  const parties = agreement.parties || [];
  const payments = agreement.payments || [];
  const paymentsTotal = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

  const partiesHtml = parties.map((p, i) => `
    <div class="party-card">
      <div class="party-card-header">
        <span class="party-badge">${escapeHtml(p.selectParty || `Party ${i + 1}`)}</span>
        ${p.image ? `<img class="party-photo" src="${p.image}" alt="" />` : ''}
      </div>
      <table class="party-table">
        <tr><td class="label">Name</td><td>${escapeHtml(p.name) || '—'}</td>
            <td class="label">Type</td><td>${escapeHtml(p.type) || '—'}</td></tr>
        <tr><td class="label">Phone</td><td>${escapeHtml(p.phone) || '—'}</td>
            <td class="label">Email</td><td>${escapeHtml(p.email) || '—'}</td></tr>
        <tr><td class="label">NID</td><td>${escapeHtml(p.nid) || '—'}</td>
            <td class="label">Position</td><td>${escapeHtml(p.position) || '—'}</td></tr>
        <tr><td class="label">Address</td><td colspan="3">${escapeHtml(p.address) || '—'}</td></tr>
        ${p.details ? `<tr><td class="label">Details</td><td colspan="3">${escapeHtml(p.details)}</td></tr>` : ''}
      </table>
    </div>
  `).join('');

  const paymentsRowsHtml = payments.map((p) => `
    <tr>
      <td>${escapeHtml(p.details) || '—'}</td>
      <td class="amount">${formatAmount(p.amount)}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  body {
    font-family: 'Helvetica Neue', Arial, sans-serif;
    color: #1e293b;
    font-size: 12px;
    margin: 0;
    padding: 0;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 2px solid #4f46e5;
    padding-bottom: 14px;
    margin-bottom: 20px;
  }
  .brand { font-size: 20px; font-weight: 700; color: #4f46e5; }
  .brand-sub { font-size: 10px; color: #94a3b8; letter-spacing: 1px; text-transform: uppercase; }
  .meta { text-align: right; font-size: 11px; color: #475569; }
  .meta div { margin-bottom: 2px; }
  h1.title {
    font-size: 17px;
    text-align: center;
    margin: 0 0 22px;
    color: #0f172a;
  }
  h2.section-title {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #64748b;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 6px;
    margin: 24px 0 12px;
  }
  .party-card {
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 10px 12px;
    margin-bottom: 10px;
    page-break-inside: avoid;
  }
  .party-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
  }
  .party-badge {
    display: inline-block;
    background: #eef2ff;
    color: #4f46e5;
    font-size: 10px;
    font-weight: 600;
    padding: 3px 8px;
    border-radius: 999px;
  }
  .party-photo { width: 40px; height: 40px; border-radius: 6px; object-fit: cover; border: 1px solid #e2e8f0; }
  table.party-table { width: 100%; border-collapse: collapse; font-size: 11px; }
  table.party-table td { padding: 3px 4px; vertical-align: top; }
  table.party-table td.label { color: #94a3b8; width: 60px; white-space: nowrap; }
  .rich-content { font-size: 11.5px; line-height: 1.6; color: #334155; }
  .rich-content img { max-width: 100%; }
  table.payments-table { width: 100%; border-collapse: collapse; font-size: 11.5px; margin-top: 4px; }
  table.payments-table th {
    text-align: left;
    font-size: 10px;
    text-transform: uppercase;
    color: #94a3b8;
    border-bottom: 1px solid #e2e8f0;
    padding: 6px 4px;
  }
  table.payments-table td { padding: 7px 4px; border-bottom: 1px solid #f1f5f9; }
  table.payments-table td.amount, table.payments-table th.amount { text-align: right; }
  tr.total-row td { font-weight: 700; color: #4f46e5; border-top: 2px solid #4f46e5; border-bottom: none; }
  .footer-content { margin-top: 26px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 10.5px; color: #64748b; }
</style>
</head>
<body>

  <div class="header">
    <div>
      <div class="brand">TRIKON</div>
      <div class="brand-sub">Business Management</div>
    </div>
    <div class="meta">
      <div><strong>Reference:</strong> ${escapeHtml(agreement.reference) || 'N/A'}</div>
      <div><strong>Date:</strong> ${formatDate(agreement.date)}</div>
      <div><strong>Project:</strong> ${escapeHtml(agreement.project) || 'N/A'}</div>
    </div>
  </div>

  ${agreement.title ? `<h1 class="title">${escapeHtml(agreement.title)}</h1>` : ''}

  ${parties.length ? `
    <h2 class="section-title">Agreement Parties</h2>
    ${partiesHtml}
  ` : ''}

  ${agreement.termsConditions ? `
    <h2 class="section-title">Terms &amp; Conditions</h2>
    <div class="rich-content">${agreement.termsConditions}</div>
  ` : ''}

  ${payments.length ? `
    <h2 class="section-title">Payment Details</h2>
    <table class="payments-table">
      <thead><tr><th>Details</th><th class="amount">Amount</th></tr></thead>
      <tbody>
        ${paymentsRowsHtml}
        <tr class="total-row"><td>Total</td><td class="amount">${formatAmount(paymentsTotal)}</td></tr>
      </tbody>
    </table>
  ` : ''}

  ${agreement.footer ? `<div class="footer-content">${agreement.footer}</div>` : ''}

</body>
</html>
  `;
}

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

router.get('/:id/pdf', auth, async (req, res) => {
  let browser;
  try {
    const agreement = await Agreement.findByPk(req.params.id, { include: includes });
    if (!agreement) return res.status(404).json({ message: 'Not found' });

    const html = buildAgreementHtml(agreement);

    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '18mm', bottom: '18mm', left: '15mm', right: '15mm' },
    });
    await browser.close();
    browser = null;

    const safeName = (agreement.reference || `agreement-${agreement.id}`).replace(/[^a-z0-9-_]+/gi, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    if (browser) await browser.close().catch(() => {});
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
        original.parties.map((p) => ({
          selectParty: p.selectParty, name: p.name, phone: p.phone, email: p.email,
          nid: p.nid, position: p.position, image: p.image, address: p.address,
          type: p.type, details: p.details, agreementId: copy.id,
        })),
        { transaction: t },
      );
    }
    if (original.payments?.length) {
      await AgreementPayment.bulkCreate(
        original.payments.map((p) => ({ details: p.details, amount: p.amount, agreementId: copy.id })),
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