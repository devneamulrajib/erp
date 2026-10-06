import { useState, useEffect, useCallback, useRef } from 'react';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import { Copy, FileSpreadsheet, FileText, Search, LayoutGrid, Calendar, AlertCircle, RotateCcw, Check } from 'lucide-react';
import api from '../api/axios';
import { getUsers } from '../api/user';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import ToolbarButton from '../components/ToolbarButton';
import { getFundRequisitions } from '../api/fundRequisition';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

// One column definition drives the table exports (CSV / Excel / copy / PDF).
// Widths total 762pt = A4 landscape minus 40pt margins.
const COLS = [
  { key: 'sl', label: 'SL', width: 26, align: 'left' },
  { key: 'date', label: 'Date', width: 58, align: 'left' },
  { key: 'reference', label: 'Number', width: 56, align: 'left' },
  { key: 'project', label: 'Project', width: 100, align: 'left' },
  { key: 'from', label: 'Requested By', width: 96, align: 'left' },
  { key: 'amount', label: 'Amount', width: 66, align: 'right' },
  { key: 'approved', label: 'Approved', width: 66, align: 'right' },
  { key: 'paid', label: 'Paid', width: 66, align: 'right' },
  { key: 'balance', label: 'Balance', width: 66, align: 'right' },
  { key: 'status', label: 'Status', width: 62, align: 'left' },
  { key: 'purpose', label: 'Purpose', width: 100, align: 'left' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All (excluding cancelled)' },
  { value: 'approve:Pending Approval', label: 'Pending approval' },
  { value: 'approve:Approved', label: 'Approved' },
  { value: 'approve:Rejected', label: 'Rejected' },
  { value: 'pay:Unpaid', label: 'Unpaid' },
  { value: 'pay:Partial', label: 'Partially paid' },
  { value: 'pay:Paid', label: 'Paid' },
  { value: 'approve:Cancelled', label: 'Cancelled' },
];

const STATUS_BADGE = {
  Paid: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  Partial: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  Approved: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
  Pending: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  Rejected: 'bg-rose-50 text-rose-600 ring-rose-500/20',
  Cancelled: 'bg-slate-100 text-slate-500 ring-slate-400/20',
};

function localDate(d) {
  const x = new Date(d);
  x.setMinutes(x.getMinutes() - x.getTimezoneOffset());
  return x.toISOString().slice(0, 10);
}
function monthStart() {
  const d = new Date();
  return localDate(new Date(d.getFullYear(), d.getMonth(), 1));
}
function todayStr() { return localDate(new Date()); }
function num(v) { return Number(v) || 0; }

function asArray(res) {
  const body = res?.data ?? res;
  if (Array.isArray(body)) return body;
  return body?.rows || body?.data || [];
}

// Short, single-word status used in the table and in every export.
function statusLabel(r) {
  if (r.cancelled || r.approvalStatus === 'Cancelled') return 'Cancelled';
  if (r.approvalStatus === 'Rejected') return 'Rejected';
  if (r.approvalStatus === 'Pending Approval') return 'Pending';
  if (r.paymentState === 'Paid') return 'Paid';
  if (r.paymentState === 'Partial') return 'Partial';
  return 'Approved';
}

function toCells(r, i) {
  return {
    sl: i + 1,
    date: r.date || '',
    reference: r.reference || '',
    project: r.project?.name || '',
    from: r.from?.name || '',
    amount: num(r.amount),
    approved: num(r.payable),
    paid: num(r.paidAmount),
    balance: num(r.balance),
    status: statusLabel(r),
    purpose: r.purpose || '',
  };
}

const PRESETS = [
  { id: 'month', label: 'This month' },
  { id: 'lastMonth', label: 'Last month' },
  { id: 'days90', label: 'Last 90 days' },
  { id: 'year', label: 'This year' },
  { id: 'all', label: 'All time' },
];

function presetRange(id) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  switch (id) {
    case 'month': return [monthStart(), todayStr()];
    case 'lastMonth': return [localDate(new Date(y, m - 1, 1)), localDate(new Date(y, m, 0))];
    case 'days90': return [localDate(new Date(y, m, now.getDate() - 90)), todayStr()];
    case 'year': return [localDate(new Date(y, 0, 1)), todayStr()];
    default: return ['', ''];
  }
}

export default function FundRequisitionReportPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);

  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(todayStr());
  const [status, setStatus] = useState('');
  const [projectId, setProjectId] = useState('');
  const [requestedBy, setRequestedBy] = useState('');
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const requestSeq = useRef(0);
  const rangeInvalid = !!(from && to && from > to);

  const load = useCallback(async () => {
    if (rangeInvalid) {
      setRows([]);
      setLoading(false);
      return;
    }
    const seq = ++requestSeq.current;
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (from) params.dateFrom = from;
      if (to) params.dateTo = to;
      if (projectId) params.projectId = projectId;
      if (requestedBy) params.from = requestedBy;
      if (status.startsWith('approve:')) params.approveStatus = status.slice(8);
      if (status.startsWith('pay:')) params.paymentState = status.slice(4);
      const data = await getFundRequisitions(params);
      if (seq !== requestSeq.current) return; // a newer request superseded this one
      setRows(asArray(data));
    } catch (err) {
      if (seq !== requestSeq.current) return;
      console.error('Failed to load fund requisition report', err);
      setRows([]);
      setError(err.response?.data?.message || err.message || 'Failed to load the fund requisition report');
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, [from, to, status, projectId, requestedBy, rangeInvalid]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [from, to, status, projectId, requestedBy, search, pageSize]);

  useEffect(() => {
    api.get('/projects').then((res) => setProjects(asArray(res))).catch(() => {});
    getUsers().then((res) => setUsers(asArray(res))).catch(() => {});
  }, []);

  function applyPreset(id) {
    const [f, t] = presetRange(id);
    setFrom(f);
    setTo(t);
  }

  const q = search.trim().toLowerCase();
  const filtered = rows.filter((r) => {
    if (!q) return true;
    return [r.reference, r.project?.name, r.site?.name, r.from?.name, r.payTo, r.category, r.purpose]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
  });

  const totals = filtered.reduce((acc, r) => ({
    amount: acc.amount + num(r.amount),
    approved: acc.approved + num(r.payable),
    paid: acc.paid + num(r.paidAmount),
    balance: acc.balance + num(r.balance),
  }), { amount: 0, approved: 0, paid: 0, balance: 0 });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const header = COLS.map((c) => c.label);
  const bodyCells = () => filtered.map((r, i) => COLS.map((c) => toCells(r, i)[c.key]));
  const totalRow = () => COLS.map((c) => {
    if (c.key === 'project') return 'TOTAL';
    if (['amount', 'approved', 'paid', 'balance'].includes(c.key)) return totals[c.key];
    return '';
  });
  const rangeLabel = `${from || 'start'} to ${to || 'today'}`;
  const fileStem = `fund-requisition-report-${from || 'all'}-to-${to || 'all'}`;

  function exportCsv() {
    const lines = [...bodyCells(), totalRow()];
    const csv = [header, ...lines].map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileStem}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Real .xlsx workbook: numeric cells stay numeric so Excel can sum/format them.
  function exportExcel() {
    const ws = XLSX.utils.aoa_to_sheet([header, ...bodyCells(), totalRow()]);
    ws['!cols'] = [
      { wch: 6 }, { wch: 12 }, { wch: 10 }, { wch: 24 }, { wch: 20 },
      { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 36 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Fund Requisitions');
    XLSX.writeFile(wb, `${fileStem}.xlsx`);
  }

  // Text-based PDF drawn with jsPDF's core API (sharp, selectable text).
  // Paginates automatically and redraws the table header on each page.
  function exportPdf() {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const marginX = 40;
    const pageWidth = doc.internal.pageSize.getWidth ? doc.internal.pageSize.getWidth() : doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.getHeight ? doc.internal.pageSize.getHeight() : doc.internal.pageSize.height;
    const tableWidth = COLS.reduce((sum, c) => sum + c.width, 0);
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
      doc.text(`Date Range: ${rangeLabel}`, pageWidth - marginX, y + 14, { align: 'right' });
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
      COLS.forEach((col) => {
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
      COLS.forEach((col) => {
        const raw = cells[col.key];
        const text = typeof raw === 'number' && col.align === 'right' ? raw.toLocaleString() : String(raw ?? '');
        const tx = col.align === 'right' ? x + col.width - 6 : x + 6;
        const lines = doc.splitTextToSize(text, col.width - 10);
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
      filtered.forEach((r, i) => drawRow(toCells(r, i), { striped: i % 2 === 1 }));
    }

    ensureSpace(rowHeight);
    doc.setDrawColor(79, 70, 229);
    doc.setLineWidth(1);
    doc.line(marginX, y, marginX + tableWidth, y);
    drawRow({
      sl: '', date: '', reference: '', project: 'TOTAL', from: '',
      amount: totals.amount, approved: totals.approved, paid: totals.paid, balance: totals.balance,
      status: '', purpose: '',
    }, { bold: true, color: [17, 24, 39] });

    doc.save(`${fileStem}.pdf`);
  }

  function copyToClipboard() {
    const lines = [header, ...bodyCells()].map((row) => row.join('\t'));
    navigator.clipboard.writeText(lines.join('\n'))
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {});
  }

  const inputCls = 'w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition';
  const hasDateRange = !!(from || to);

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
            <p className="text-sm text-slate-500 mt-0.5">Requested, approved, paid and outstanding amounts over a date range</p>
          </div>
        </div>

        {error && (
          <div className="flex items-center justify-between gap-3 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-4 py-3 mb-5">
            <span className="flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              {error}
            </span>
            <button onClick={load} className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 hover:text-red-900">
              <RotateCcw size={12} /> Retry
            </button>
          </div>
        )}

        {rangeInvalid && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 text-amber-800 text-sm rounded-xl px-4 py-3 mb-5">
            <AlertCircle size={16} className="shrink-0" />
            The From date is after the To date. Adjust the range to see results.
          </div>
        )}

        {/* Summary strip */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 mb-1">Requisitions</div>
            <div className="text-xl font-semibold text-slate-900">{filtered.length}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 mb-1">Requested</div>
            <div className="text-xl font-semibold text-slate-900">{totals.amount.toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 mb-1">Approved</div>
            <div className="text-xl font-semibold text-indigo-600">{totals.approved.toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 mb-1">Paid</div>
            <div className="text-xl font-semibold text-emerald-600">{totals.paid.toLocaleString()}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 mb-1">Still to pay</div>
            <div className="text-xl font-semibold text-red-600">{totals.balance.toLocaleString()}</div>
          </div>
        </div>

        {/* Table panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Filters */}
          <div className="p-5 border-b border-slate-100 bg-slate-50/50 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">From date</label>
                <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">To date</label>
                <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Project</label>
                <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={inputCls}>
                  <option value="">All projects</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Requested by</label>
                <select value={requestedBy} onChange={(e) => setRequestedBy(e.target.value)} className={inputCls}>
                  <option value="">All users</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputCls}>
                  {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-slate-400 mr-1">Quick range</span>
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => applyPreset(p.id)}
                  className="px-2.5 py-1 rounded-full text-xs font-medium bg-white border border-slate-200 text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-700 transition-colors"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <div className="flex items-center gap-2">
              <ToolbarButton
                icon={copied ? Check : Copy}
                label={copied ? 'Copied' : 'Copy'}
                onClick={copyToClipboard}
                color="bg-slate-100 hover:bg-slate-200 !text-slate-600"
              />
              <ToolbarButton icon={FileSpreadsheet} label="CSV" onClick={exportCsv} color="bg-sky-50 hover:bg-sky-100 !text-sky-600" />
              <ToolbarButton icon={FileSpreadsheet} label="Excel" onClick={exportExcel} color="bg-emerald-50 hover:bg-emerald-100 !text-emerald-600" />
              <ToolbarButton icon={FileText} label="PDF" onClick={exportPdf} color="bg-red-50 hover:bg-red-100 !text-red-600" />
              <div className="flex items-center gap-2 ml-2 text-sm text-slate-500">
                <span>Show</span>
                <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}
                  className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30">
                  {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
                <span>entries</span>
              </div>
            </div>
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search requisitions..."
                className="border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm w-64 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition" />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto border-t border-slate-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 whitespace-nowrap">
                  {COLS.map((c) => (
                    <th key={c.key} className={`px-5 py-3 font-medium text-xs uppercase tracking-wide ${c.align === 'right' ? 'text-right' : 'text-left'}`}>{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={COLS.length} className="text-center py-16 text-slate-400 text-sm">Loading...</td></tr>
                ) : pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={COLS.length} className="text-center py-16">
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <LayoutGrid size={28} strokeWidth={1.5} />
                        <p className="text-sm">
                          {error
                            ? 'The report could not be loaded. See the message above.'
                            : 'No requisitions found for this range. Try adjusting your filters.'}
                        </p>
                        {!error && hasDateRange && (
                          <button
                            type="button"
                            onClick={() => applyPreset('all')}
                            className="mt-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
                          >
                            Show all dates
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : pageRows.map((row, i) => {
                  const st = statusLabel(row);
                  return (
                    <tr key={row.id} className="hover:bg-slate-50/70 transition-colors whitespace-nowrap">
                      <td className="px-5 py-3.5 text-slate-400 font-mono text-xs">{(page - 1) * pageSize + i + 1}</td>
                      <td className="px-5 py-3.5 text-slate-600">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar size={13} className="text-slate-400" />{row.date}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 font-mono text-xs">{row.reference || <span className="text-slate-300">—</span>}</td>
                      <td className="px-5 py-3.5 text-slate-600">{row.project?.name || <span className="text-slate-300">—</span>}</td>
                      <td className="px-5 py-3.5 text-slate-700 font-medium">{row.from?.name || <span className="text-slate-300">—</span>}</td>
                      <td className="px-5 py-3.5 text-right text-slate-700 font-medium">{num(row.amount).toLocaleString()}</td>
                      <td className="px-5 py-3.5 text-right text-indigo-600 font-medium">
                        {row.payable ? num(row.payable).toLocaleString() : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-5 py-3.5 text-right text-emerald-600 font-medium">{num(row.paidAmount).toLocaleString()}</td>
                      <td className="px-5 py-3.5 text-right text-red-600 font-medium">
                        {row.payable ? num(row.balance).toLocaleString() : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1 ring-inset ${STATUS_BADGE[st]}`}>
                          {st}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600 max-w-[260px] truncate" title={row.purpose}>{row.purpose || <span className="text-slate-300">—</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
              {pageRows.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-50/70 font-semibold">
                    <td colSpan={5} className="px-5 py-3 text-slate-700">Total (all {filtered.length} matching)</td>
                    <td className="px-5 py-3 text-right text-slate-900">{totals.amount.toLocaleString()}</td>
                    <td className="px-5 py-3 text-right text-indigo-600">{totals.approved.toLocaleString()}</td>
                    <td className="px-5 py-3 text-right text-emerald-600">{totals.paid.toLocaleString()}</td>
                    <td className="px-5 py-3 text-right text-red-600">{totals.balance.toLocaleString()}</td>
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
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((n) => n === 1 || n === totalPages || Math.abs(n - page) <= 2)
                .map((n, idx, arr) => (
                  <span key={n} className="flex items-center gap-1.5">
                    {idx > 0 && n - arr[idx - 1] > 1 && <span className="text-slate-400 text-sm">…</span>}
                    <button onClick={() => setPage(n)}
                      className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${n === page ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30' : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                      {n}
                    </button>
                  </span>
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