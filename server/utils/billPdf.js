const PDFDocument = require('pdfkit');

function n(v) {
  return Number(v || 0).toLocaleString();
}

function buildBillPdf(bill, stream) {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  doc.pipe(stream);

  // Letterhead
  doc.fontSize(20).fillColor('#312e81').text('TRIKON', { align: 'center' });
  doc.fontSize(9).fillColor('#6b7280').text('BUSINESS MANAGEMENT', { align: 'center' });
  doc.moveDown(1);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#4338ca').lineWidth(1.5).stroke();
  doc.moveDown(1);

  doc.fontSize(18).fillColor('#111827').text('INVOICE', { align: 'center' });
  doc.moveDown(0.3);
  doc.fontSize(10).fillColor('#6b7280').text(`Invoice No: ${bill.code}`, { align: 'center' });
  doc.moveDown(1.5);

  const infoY = doc.y;
  doc.fontSize(10).fillColor('#374151');
  doc.text(`Date: ${bill.date || '-'}`, 50, infoY);
  doc.text(`Status: ${bill.status || (Number(bill.due) <= 0 ? 'Paid' : 'Unpaid')}`, 300, infoY);
  doc.moveDown(0.4);
  doc.text(`Bill To: ${bill.Customer?.name || '-'}`, 50, doc.y);
  if (bill.Project?.name) {
    doc.text(`Project: ${bill.Project.name}`, 300, doc.y - 12);
  }
  doc.moveDown(1.5);

  // Line items table
  const items = bill.BillLineItems || bill.items || [];
  const tableTop = doc.y;
  const cols = { name: 50, desc: 170, qty: 340, rate: 390, amount: 470 };

  doc.rect(50, tableTop, 495, 20).fill('#312e81');
  doc.fillColor('#ffffff').fontSize(9);
  doc.text('Item', cols.name + 4, tableTop + 5);
  doc.text('Description', cols.desc + 4, tableTop + 5);
  doc.text('Qty', cols.qty + 4, tableTop + 5);
  doc.text('Rate', cols.rate + 4, tableTop + 5);
  doc.text('Amount', cols.amount + 4, tableTop + 5);

  let y = tableTop + 20;
  doc.fontSize(9);
  items.forEach((it, i) => {
    const rowH = 20;
    if (y > 700) { doc.addPage(); y = 50; }
    if (i % 2 === 1) doc.rect(50, y, 495, rowH).fill('#f3f4f6');
    doc.fillColor('#111827');
    doc.text(it.itemName || '-', cols.name + 4, y + 5, { width: 115 });
    doc.text(it.description || '-', cols.desc + 4, y + 5, { width: 165 });
    doc.text(String(it.quantity ?? 0), cols.qty + 4, y + 5);
    doc.text(n(it.rate), cols.rate + 4, y + 5);
    doc.text(n(it.amount), cols.amount + 4, y + 5);
    y += rowH;
  });

  y += 10;
  doc.moveTo(50, y).lineTo(545, y).strokeColor('#e5e7eb').stroke();
  y += 10;

  function totalLine(label, value, bold) {
    doc.fontSize(bold ? 11 : 10).fillColor(bold ? '#111827' : '#4b5563');
    doc.text(label, 350, y, { width: 100, align: 'right' });
    doc.text(n(value), 460, y, { width: 85, align: 'right' });
    y += bold ? 18 : 15;
  }
  totalLine('Subtotal', bill.subtotal);
  if (bill.vatIncluded) totalLine(`VAT (${bill.vatPercent}%)`, bill.vatAmount);
  if (bill.aitIncluded) totalLine(`AIT (${bill.aitPercent}%)`, bill.aitAmount);
  if (Number(bill.interestRate) > 0) totalLine(`Interest (${bill.interestRate}%)`, bill.interestAmount);
  totalLine('Grand Total', bill.grandTotal, true);
  totalLine('Paid', bill.paid);
  totalLine('Due', bill.due, true);

  // Payment history
  const payments = bill.BillPayments || bill.payments || [];
  if (payments.length) {
    y += 15;
    if (y > 700) { doc.addPage(); y = 50; }
    doc.fontSize(11).fillColor('#312e81').text('Payment History', 50, y);
    y += 18;
    doc.fontSize(9).fillColor('#374151');
    payments.forEach((p) => {
      if (y > 760) { doc.addPage(); y = 50; }
      doc.text(`${p.date || '-'}  |  ${p.paymentMethod || '-'}  |  ${n(p.amount)}`, 50, y);
      y += 14;
    });
  }

  doc.fontSize(8).fillColor('#9ca3af').text(
    `Generated via TRIKON ERP on ${new Date().toLocaleDateString('en-GB')}`,
    50, 780, { align: 'center', width: 495 }
  );

  doc.end();
}

module.exports = { buildBillPdf };