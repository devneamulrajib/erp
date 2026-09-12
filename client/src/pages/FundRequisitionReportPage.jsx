import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { Copy, FileSpreadsheet, FileText, Search, LayoutGrid, Calendar } from 'lucide-react';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import ToolbarButton from '../components/ToolbarButton';
import { getFundRequisitions } from '../api/fundRequisition';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

const PDF_COLUMNS = [
  { key: 'sl', label: 'SL', width: 28, align: 'left' },
  { key: 'date', label: 'Date', width: 68, align: 'left' },
  { key: 'from', label: 'From', width: 95, align: 'left' },
  { key: 'to', label: 'To', width: 40, align: 'left' },
  { key: 'amount', label: 'Amount', width: 80, align: 'right' },
  { key: 'approvedAmount', label: 'Approved Amount', width: 95, align: 'right' },
  { key: 'purpose', label: 'Purpose', width: 195, align: 'left' },
  { key: 'reference', label: 'Reference', width: 120, align: 'left' },
];

function monthStart() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
function todayStr() { return new Date().toISOString().slice(0, 10); }

function num(v) { return Number(v) || 0; }

export default function FundRequisitionReportPage() {
  useNavigate(); // kept for parity with other report pages; not used yet
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(todayStr());
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getFundRequisitions();
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load fund requisition report', err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Date range + search are applied client-side since the fund-requisitions
  // API doesn't currently accept from/to params (only `from` user id + approveStatus).
  const filtered = rows.filter((r) => {
    if (r.date) {
      if (from && r.date < from) return false;
      if (to && r.date > to) return false;
    }
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return [r.from?.name, r.purpose, r.reference]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
  });

  const totals = filtered.reduce((acc, r) => ({
    amount: acc.amount + num(r.amount),
    approvedAmount: acc.approvedAmount + num(r.approvedAmount),
  }), { amount: 0, approvedAmount: 0 });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  function exportCsv() {
    const header = ['SL', 'Date', 'From', 'To', 'Amount', 'Approved Amount', 'Purpose', 'Reference'];
    const lines = filtered.map((r, i) => [
      i + 1, r.date, r.from?.name || 'TBA', '', num(r.amount), num(r.approvedAmount), r.purpose || '', r.reference || '',
    ]);
    lines.push(['', '', '', 'TOTAL', totals.amount, totals.approvedAmount, '', '']);
    const csv = [header, ...lines].map((row) => row.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fund-requisition-report-${from}-to-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Real .xlsx workbook (not CSV renamed) — numeric cells stay numeric so
  // Excel can sum/format them, and column widths are set for readability.
  function exportExcel() {
    const header = ['SL', 'Date', 'From', 'To', 'Amount', 'Approved Amount', 'Purpose', 'Reference'];
    const body = filtered.map((r, i) => [
      i + 1,
      r.date || '',
      r.from?.name || 'TBA',
      '',
      num(r.amount),
      r.approvedAmount ? num(r.approvedAmount) : '',
      r.purpose || '',
      r.reference || '',
    ]);
    body.push(['', '', '', 'TOTAL', totals.amount, totals.approvedAmount, '', '']);

    const ws = XLSX.utils.aoa_to_sheet([header, ...body]);
    ws['!cols'] = [
      { wch: 6 }, { wch: 12 }, { wch: 20 }, { wch: 8 },
      { wch: 14 }, { wch: 16 }, { wch: 30 }, { wch: 20 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Fund Requisitions');
    XLSX.writeFile(wb, `fund-requisition-report-${from}-to-${to}.xlsx`);
  }

  // Real, text-based PDF drawn directly with jsPDF's core API (lines/rects/text) —
  // not a screenshot of the page, so it stays sharp and the text is selectable.
  // Paginates automatically by redrawing the table header on each new page.
  function exportPdf() {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const marginX = 40;
    const pageWidth = doc.internal.pageSize.getWidth
      ? doc.internal.pageSize.getWidth()
      : doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.getHeight
      ? doc.internal.pageSize.getHeight()
      : doc.internal.pageSize.height;
    const tableWidth = PDF_COLUMNS.reduce((sum, c) => sum + c.width, 0);
    const rowHeight = 20;
    const bottomMargin = 50;
    let y = 40;

    function drawDocHeader() {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(17, 24, 39);
      doc.text('TRIKON', marginX, y + 14);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text('Fund Requisition Report', marginX, y + 30);
      doc.text(`Date Range: ${from} to ${to}`, pageWidth - marginX, y + 14, { align: 'right' });
      doc.setDrawColor(226, 232, 240);
      doc.line(marginX, y + 40, marginX + tableWidth, y + 40);
      y += 55;
    }

    function drawTableHeader() {
      doc.setFillColor(79, 70, 229);
      doc.rect(marginX, y, tableWidth, rowHeight, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      let x = marginX;
      PDF_COLUMNS.forEach((col) => {
        const tx = col.align === 'right' ? x + col.width - 6 : x + 6;
        doc.text(col.label.toUpperCase(), tx, y + 13, { align: col.align === 'right' ? 'right' : 'left' });
        x += col.width;
      });
      y += rowHeight;
    }

    function ensureSpace(needed) {
      if (y + needed > pageHeight - bottomMargin) {
        doc.addPage();
        y = 40;
        drawTableHeader();
      }
    }

    function drawRow(cells, opts = {}) {
      ensureSpace(rowHeight);
      if (opts.striped) {
        doc.setFillColor(248, 250, 252);
        doc.rect(marginX, y, tableWidth, rowHeight, 'F');
      }
      doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
      doc.setFontSize(8);
      const [r, g, b] = opts.color || [30, 41, 59];
      doc.setTextColor(r, g, b);
      let x = marginX;
      PDF_COLUMNS.forEach((col) => {
        const text = String(cells[col.key] ?? '');
        const tx = col.align === 'right' ? x + col.width - 6 : x + 6;
        const maxWidth = col.width - 10;
        const lines = doc.splitTextToSize(text, maxWidth);
        doc.text(lines[0] || '', tx, y + 13, { align: col.align === 'right' ? 'right' : 'left' });
        x += col.width;
      });
      y += rowHeight;
    }

    drawDocHeader();
    drawTableHeader();

    if (filtered.length === 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184);
      doc.text('No requisitions found for this range.', marginX + 6, y + 16);
      y += rowHeight;
    } else {
      filtered.forEach((r, i) => {
        drawRow({
          sl: i + 1,
          date: r.date || '',
          from: r.from?.name || 'TBA',
          to: '',
          amount: num(r.amount).toLocaleString(),
          approvedAmount: r.approvedAmount ? num(r.approvedAmount).toLocaleString() : '',
          purpose: r.purpose || '',
          reference: r.reference || '',
        }, { striped: i % 2 === 1 });
      });
    }

    ensureSpace(rowHeight);
    doc.setDrawColor(79, 70, 229);
    doc.setLineWidth(1);
    doc.line(marginX, y, marginX + tableWidth, y);
    drawRow({
      sl: '', date: '', from: '', to: 'TOTAL',
      amount: totals.amount.toLocaleString(),
      approvedAmount: totals.approvedAmount.toLocaleString(),
      purpose: '', reference: '',
    }, { bold: true, color: [17, 24, 39] });

    doc.save(`fund-requisition-report-${from}-to-${to}.pdf`);
  }

  function copyToClipboard() {
    const header = ['SL', 'Date', 'From', 'To', 'Amount', 'Approved Amount', 'Purpose', 'Reference'].join('\t');
    const lines = filtered.map((r, i) => [
      i + 1, r.date, r.from?.name || 'TBA', '', num(r.amount), num(r.approvedAmount), r.purpose || '', r.reference || '',
    ].join('\t'));
    navigator.clipboard.writeText([header, ...lines].join('\n')).catch(() => {});
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 text-left">
      <Topbar />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <Breadcrumb items={[
              { label: 'Home', to: '/dashboard' },
              { label: 'Requisition', to: '/requisition-module/fund-requisition' },
              { label: 'Fund Requisition Report' },
            ]} />
            <h1 className="text-2xl font-semibold text-slate-900 mt-1 tracking-tight">Fund Requisition Report</h1>
            <p className="text-sm text-slate-500 mt-0.5">Review fund requisitions and their approved amounts over a date range</p>
          </div>
        </div>

        {/* Summary strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Total Requisitions</div>
            <div className="text-xl font-semibold text-slate-900">{filtered.length}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Total Amount</div>
            <div className="text-xl font-semibold text-slate-900">{totals.amount.toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Approved Amount</div>
            <div className="text-xl font-semibold text-emerald-600">{totals.approvedAmount.toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Showing</div>
            <div className="text-xl font-semibold text-slate-900">{pageRows.length} / {filtered.length}</div>
          </div>
        </div>

        {/* Table panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Date range filter */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-5 border-b border-slate-100 bg-slate-50/50 max-w-xl">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">From Date</label>
              <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">To Date</label>
              <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition" />
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div className="flex items-center gap-2">
              <ToolbarButton icon={Copy} label="Copy" onClick={copyToClipboard} color="bg-slate-100 hover:bg-slate-200 !text-slate-600" />
              <ToolbarButton icon={FileSpreadsheet} label="CSV" onClick={exportCsv} color="bg-sky-50 hover:bg-sky-100 !text-sky-600" />
              <ToolbarButton icon={FileSpreadsheet} label="Excel" onClick={exportExcel} color="bg-emerald-50 hover:bg-emerald-100 !text-emerald-600" />
              <ToolbarButton icon={FileText} label="PDF" onClick={exportPdf} color="bg-red-50 hover:bg-red-100 !text-red-600" />
              <div className="flex items-center gap-2 ml-2 text-sm text-slate-500">
                <span>Show</span>
                <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                  className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30">
                  {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
                <span>entries</span>
              </div>
            </div>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search requisitions..."
                className="border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm w-64 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition" />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto border-t border-slate-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 whitespace-nowrap">
                  <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">SL</th>
                  <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Date</th>
                  <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">From</th>
                  <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">To</th>
                  <th className="px-5 py-3 text-right font-medium text-xs uppercase tracking-wide">Amount</th>
                  <th className="px-5 py-3 text-right font-medium text-xs uppercase tracking-wide">Approved Amount</th>
                  <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Purpose</th>
                  <th className="px-5 py-3 text-left font-medium text-xs uppercase tracking-wide">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="text-center py-16 text-slate-400 text-sm">Loading...</td>
                  </tr>
                ) : pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <LayoutGrid size={28} strokeWidth={1.5} />
                        <p className="text-sm">No requisitions found for this range. Try adjusting your filters.</p>
                      </div>
                    </td>
                  </tr>
                ) : pageRows.map((row, i) => (
                  <tr key={row._id} className="hover:bg-slate-50/70 transition-colors whitespace-nowrap">
                    <td className="px-5 py-3.5 text-slate-400 font-mono text-xs">{(page - 1) * pageSize + i + 1}</td>
                    <td className="px-5 py-3.5 text-slate-600">
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar size={13} className="text-slate-400" />{row.date}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-700 font-medium">{row.from?.name || 'TBA'}</td>
                    <td className="px-5 py-3.5 text-slate-300">—</td>
                    <td className="px-5 py-3.5 text-right text-slate-700 font-medium">{num(row.amount).toLocaleString()}</td>
                    <td className="px-5 py-3.5 text-right text-emerald-600 font-medium">
                      {row.approvedAmount ? num(row.approvedAmount).toLocaleString() : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">{row.purpose || <span className="text-slate-300">—</span>}</td>
                    <td className="px-5 py-3.5 text-slate-500 font-mono text-xs">{row.reference || <span className="text-slate-300">—</span>}</td>
                  </tr>
                ))}
              </tbody>
              {pageRows.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-50/70 font-semibold">
                    <td colSpan={4} className="px-5 py-3 text-slate-700">Total</td>
                    <td className="px-5 py-3 text-right text-slate-900">{totals.amount.toLocaleString()}</td>
                    <td className="px-5 py-3 text-right text-emerald-600">{totals.approvedAmount.toLocaleString()}</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100">
            <span className="text-sm text-slate-500">
              Showing <span className="font-medium text-slate-700">{filtered.length === 0 ? 0 : (page - 1) * pageSize + 1}</span> to{' '}
              <span className="font-medium text-slate-700">{Math.min(page * pageSize, filtered.length)}</span> of{' '}
              <span className="font-medium text-slate-700">{filtered.length}</span> entries
            </span>
            <div className="flex gap-1.5">
              <button disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg text-sm bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition-colors">
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button key={n} onClick={() => setPage(n)}
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${n === page ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                  {n}
                </button>
              ))}
              <button disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 rounded-lg text-sm bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition-colors">
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}