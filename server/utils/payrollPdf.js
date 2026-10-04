const PDFDocument = require('pdfkit');

function n(v) {
  return Number(v || 0).toLocaleString();
}
function money(v) {
  return `৳${n(v)}`;
}
function fmtDate(d) {
  if (!d) return '-';
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return String(d);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function drawLetterhead(doc) {
  doc.fontSize(20).fillColor('#312e81').text('TRIKON', { align: 'center' });
  doc.fontSize(9).fillColor('#6b7280').text('BUSINESS MANAGEMENT', { align: 'center' });
  doc.moveDown(1);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#4338ca').lineWidth(1.5).stroke();
  doc.moveDown(1);
}

function addPageNumbers(doc) {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc.fontSize(8).fillColor('#9ca3af').text(
      `Page ${i - range.start + 1} of ${range.count}  ·  Generated via TRIKON ERP on ${new Date().toLocaleDateString('en-GB')}`,
      50, 780, { align: 'center', width: 495 }
    );
  }
}

/* ---------------- Individual payslip ---------------- */

function buildPaySlipPdf(slip, stream) {
  const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });
  doc.pipe(stream);

  drawLetterhead(doc);

  doc.fontSize(18).fillColor('#111827').text('PAY SLIP', { align: 'center' });
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor('#6b7280').text(
    `Reference: PAYSLIP-${slip.id}  ·  ${MONTHS[slip.month - 1]} ${slip.year}`,
    { align: 'center' }
  );
  doc.moveDown(1.5);

  // Employee info block
  const infoY = doc.y;
  doc.fontSize(10).fillColor('#374151');
  doc.text(`Employee: ${slip.employee?.name || '-'}`, 50, infoY);
  doc.text(`Employee Code: ${slip.employee?.code || '-'}`, 300, infoY);
  doc.text(`Designation: ${slip.employee?.designation || '-'}`, 50, infoY + 16);
  doc.text(`Department: ${slip.employee?.department || '-'}`, 300, infoY + 16);
  doc.text(`Pay Period: ${MONTHS[slip.month - 1]} ${slip.year}`, 50, infoY + 32);
  doc.text(`Status: ${slip.status}`, 300, infoY + 32);
  if (slip.status === 'Paid') {
    doc.text(`Payment Date: ${fmtDate(slip.paidDate)}`, 50, infoY + 48);
  }
  doc.y = infoY + (slip.status === 'Paid' ? 68 : 52);
  doc.moveDown(1);

  // Earnings table
  const cols = { label: 50, amount: 460 };
  function sectionHeader(title) {
    doc.rect(50, doc.y, 495, 20).fill('#312e81');
    doc.fillColor('#ffffff').fontSize(10).text(title, cols.label + 4, doc.y + 5 - 20 + 20, { continued: false });
    // The rect advances nothing; manually set text at correct baseline:
  }

  function rowLine(label, value, opts = {}) {
    const y = doc.y;
    doc.fontSize(opts.bold ? 10.5 : 10).fillColor(opts.color || (opts.bold ? '#111827' : '#374151'));
    doc.text(label, cols.label, y, { width: 350 });
    doc.text(money(value), cols.amount - 60, y, { width: 150, align: 'right' });
    doc.moveDown(0.6);
  }

  function tableHeaderBar(title) {
    const y = doc.y;
    doc.rect(50, y, 495, 20).fill('#312e81');
    doc.fillColor('#ffffff').fontSize(10).text(title, 54, y + 5);
    doc.y = y + 26;
  }

  tableHeaderBar('EARNINGS');
  rowLine('Basic Salary', slip.basicSalary);
  rowLine('House Rent', slip.houseRent);
  rowLine('Medical Allowance', slip.medicalAllowance);
  rowLine('Other Allowance', slip.otherAllowance);
  if (Number(slip.otherAddition) > 0) rowLine('Bonus / Addition', slip.otherAddition, { color: '#059669' });
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e5e7eb').stroke();
  doc.moveDown(0.3);
  rowLine('Gross Salary', slip.grossSalary, { bold: true });
  doc.moveDown(0.5);

  tableHeaderBar('DEDUCTIONS');
  const breakdown = Array.isArray(slip.advanceBreakdown)
    ? slip.advanceBreakdown
    : (slip.advanceBreakdown ? JSON.parse(slip.advanceBreakdown) : []);
  if (breakdown.length) {
    breakdown.forEach((b) => rowLine(`Advance / Loan Deduction (${b.type || 'Advance'} #${b.advanceId})`, b.deduct, { color: '#b45309' }));
  } else if (Number(slip.advanceDeduction) > 0) {
    rowLine('Advance / Loan Deduction', slip.advanceDeduction, { color: '#b45309' });
  }
  (slip.deductions || []).forEach((d) => rowLine(d.title, d.amount, { color: '#b45309' }));
  if (!breakdown.length && !(slip.deductions || []).length && Number(slip.otherDeduction) === 0 && Number(slip.advanceDeduction) === 0) {
    doc.fontSize(9).fillColor('#9ca3af').text('No deductions for this period', cols.label, doc.y);
    doc.moveDown(0.6);
  }
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#e5e7eb').stroke();
  doc.moveDown(0.3);
  rowLine('Total Deduction', slip.totalDeduction, { bold: true, color: '#b45309' });
  doc.moveDown(1);

  // Net salary highlight box
  const boxY = doc.y;
  doc.rect(50, boxY, 495, 34).fill('#ecfdf5');
  doc.fontSize(12).fillColor('#047857').text('NET SALARY', 60, boxY + 10);
  doc.fontSize(14).fillColor('#047857').text(money(slip.netSalary), 350, boxY + 8, { width: 185, align: 'right' });
  doc.y = boxY + 34;
  doc.moveDown(1.5);

  // Payment info
  if (slip.status === 'Paid') {
    doc.fontSize(9).fillColor('#6b7280');
    doc.text(`Paid via voucher on ${fmtDate(slip.paidDate)}.`, 50, doc.y);
    doc.moveDown(1.5);
  }

  // Signature area
  const sigY = doc.y + 30;
  if (sigY < 720) {
    doc.moveTo(70, sigY).lineTo(230, sigY).strokeColor('#9ca3af').stroke();
    doc.moveTo(365, sigY).lineTo(525, sigY).strokeColor('#9ca3af').stroke();
    doc.fontSize(9).fillColor('#6b7280');
    doc.text('Employee Signature', 70, sigY + 5, { width: 160, align: 'center' });
    doc.text('Authorized Signature', 365, sigY + 5, { width: 160, align: 'center' });
  }

  addPageNumbers(doc);
  doc.end();
}

/* ---------------- Full payroll report ---------------- */

function buildPayrollReportPdf(slips, meta, stream) {
  const doc = new PDFDocument({ size: 'A4', margin: 40, layout: 'landscape', bufferPages: true });
  doc.pipe(stream);

  doc.fontSize(20).fillColor('#312e81').text('TRIKON', { align: 'center' });
  doc.fontSize(9).fillColor('#6b7280').text('BUSINESS MANAGEMENT', { align: 'center' });
  doc.moveDown(0.8);
  doc.moveTo(40, doc.y).lineTo(802, doc.y).strokeColor('#4338ca').lineWidth(1.5).stroke();
  doc.moveDown(0.8);

  doc.fontSize(16).fillColor('#111827').text('PAYROLL REPORT', { align: 'center' });
  doc.moveDown(0.2);
  const periodLabel = meta.month
    ? `${MONTHS[meta.month - 1]} ${meta.year || ''}`
    : (meta.year ? `Year ${meta.year}` : 'All Periods');
  doc.fontSize(9).fillColor('#6b7280').text(
    `${periodLabel}${meta.status ? `  ·  Status: ${meta.status}` : ''}${meta.employeeName ? `  ·  Employee: ${meta.employeeName}` : ''}`,
    { align: 'center' }
  );
  doc.moveDown(1);

  const cols = [
    { key: 'name', label: 'Employee', x: 40, w: 110 },
    { key: 'code', label: 'ID', x: 150, w: 55 },
    { key: 'dept', label: 'Dept/Designation', x: 205, w: 110 },
    { key: 'period', label: 'Period', x: 315, w: 70 },
    { key: 'basic', label: 'Basic', x: 385, w: 60, align: 'right' },
    { key: 'allowances', label: 'Allowances', x: 445, w: 65, align: 'right' },
    { key: 'deductions', label: 'Deductions', x: 510, w: 65, align: 'right' },
    { key: 'net', label: 'Net Salary', x: 575, w: 70, align: 'right' },
    { key: 'status', label: 'Status', x: 645, w: 55, align: 'center' },
    { key: 'paidDate', label: 'Paid Date', x: 700, w: 102, align: 'right' },
  ];

  function drawHeaderRow(y) {
    doc.rect(40, y, 762, 20).fill('#312e81');
    doc.fillColor('#ffffff').fontSize(8.5);
    cols.forEach((c) => doc.text(c.label, c.x + 3, y + 6, { width: c.w - 6, align: c.align || 'left' }));
    return y + 20;
  }

  let y = drawHeaderRow(doc.y);
  doc.fontSize(8.5);

  let totalPaid = 0;
  let totalNet = 0;
  slips.forEach((s, i) => {
    if (y > 520) {
      doc.addPage();
      y = 40;
      y = drawHeaderRow(y);
      doc.fontSize(8.5);
    }
    const rowH = 18;
    if (i % 2 === 1) doc.rect(40, y, 762, rowH).fill('#f3f4f6');
    doc.fillColor('#111827');
    const allowances = Number(s.houseRent || 0) + Number(s.medicalAllowance || 0) + Number(s.otherAllowance || 0) + Number(s.otherAddition || 0);
    const deductions = Number(s.totalDeduction || 0);
    const vals = {
      name: s.employee?.name || '-',
      code: s.employee?.code || '-',
      dept: [s.employee?.designation, s.employee?.department].filter(Boolean).join(' / ') || '-',
      period: `${MONTHS[s.month - 1].slice(0, 3)} ${s.year}`,
      basic: n(s.basicSalary),
      allowances: n(allowances),
      deductions: n(deductions),
      net: n(s.netSalary),
      status: s.status,
      paidDate: s.status === 'Paid' ? fmtDate(s.paidDate) : '-',
    };
    cols.forEach((c) => doc.text(String(vals[c.key]), c.x + 3, y + 5, { width: c.w - 6, align: c.align || 'left' }));
    totalNet += Number(s.netSalary || 0);
    if (s.status === 'Paid') totalPaid += Number(s.netSalary || 0);
    y += rowH;
  });

  y += 8;
  if (y > 540) { doc.addPage(); y = 40; }
  doc.moveTo(40, y).lineTo(802, y).strokeColor('#e5e7eb').stroke();
  y += 10;
  doc.fontSize(10).fillColor('#374151');
  doc.text(`Entries: ${slips.length}`, 40, y);
  doc.fontSize(11).fillColor('#111827').text(`Total Net Salary: ${money(totalNet)}`, 300, y, { width: 240, align: 'right' });
  y += 18;
  doc.fontSize(12).fillColor('#047857').text(`Total Amount Paid: ${money(totalPaid)}`, 300, y, { width: 240, align: 'right' });

  addPageNumbers(doc);
  doc.end();
}

module.exports = { buildPaySlipPdf, buildPayrollReportPdf };