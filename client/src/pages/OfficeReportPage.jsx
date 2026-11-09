// client/src/pages/OfficeReportPage.jsx
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Printer,
  FileSpreadsheet,
  FileDown,
  Download,
  ChevronDown,
  Loader2,
  Calendar,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Activity,
  Layers,
  FileText,
  Banknote,
  RotateCcw,
  ShieldCheck,
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  X,
} from 'lucide-react';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import { getOfficeExpenseReport, getOfficeExpenses } from '../api/officeExpense';
import { getActivityLog } from '../api/activityLog';
import logo from '../assets/trikon-logo.png';

const COUNT_PENDING = false;
const COMPANY = 'TRIKON REAL ESTATE & DEVELOPMENTS';
const REPORT_TITLE = 'Office Cash Account Statement';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const formatMoney = (v) =>
  Number(v || 0).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const num = (v) =>
  Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const csvText = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

// Safe date parser to avoid timezone day shifts
const parseDate = (val) => {
  if (!val) return new Date();
  if (val instanceof Date) return val;
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(s);
};

const fmtDate = (d) =>
  d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

const signed = (n) => `${n < 0 ? '-' : ''}৳${formatMoney(Math.abs(n))}`;

const statusLabel = (r) => {
  if (r.type === 'in') return 'Received';
  if (r.status === 'approved') return 'Paid';
  if (r.status === 'pending') return 'Pending';
  return 'Rejected';
};

function signedPlain(n) {
  return `${n < 0 ? '-' : ''}BDT ${num(Math.abs(n))}`;
}

const loadImageDataUrl = (src) =>
  new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          canvas.getContext('2d').drawImage(img, 0, 0);
          resolve({ url: canvas.toDataURL('image/png'), w: img.naturalWidth, h: img.naturalHeight });
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = src;
    } catch {
      resolve(null);
    }
  });

export default function OfficeReportPage() {
  const navigate = useNavigate();

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12

  // Defaults to Current Month
  const [year, setYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [dateMode, setDateMode] = useState('month'); // 'month' | 'range'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [activeTab, setActiveTab] = useState('statement');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const [data, setData] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [activity, setActivity] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);

  const [exportOpen, setExportOpen] = useState(false);
  const [exporting, setExporting] = useState('');
  const [exportError, setExportError] = useState('');

  const statementHash = useMemo(() => {
    const periodCode =
      dateMode === 'range'
        ? 'RNG'
        : selectedMonth
        ? String(selectedMonth).padStart(2, '0')
        : 'ANN';
    return `STMT-${year}-${periodCode}-${Math.abs((year * 31 + selectedMonth * 7) ^ 0x5f3759df)
      .toString(16)
      .toUpperCase()}`;
  }, [year, selectedMonth, dateMode]);

  // Load backend data
  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [reportRes, expenseRes] = await Promise.allSettled([
        getOfficeExpenseReport(year),
        getOfficeExpenses({ year, limit: 1000 }),
      ]);

      if (reportRes.status === 'fulfilled') {
        setData(reportRes.value);
      } else {
        throw new Error(reportRes.reason?.response?.data?.message || 'Failed to fetch report summary');
      }

      if (expenseRes.status === 'fulfilled') {
        const raw = expenseRes.value;
        setExpenses(Array.isArray(raw) ? raw : raw?.data || raw?.expenses || []);
      } else {
        setExpenses([]);
      }
    } catch (err) {
      setError(err.message || 'Error compiling statement data');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [year]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadAudit = useCallback(async () => {
    setActivityLoading(true);
    try {
      const params = { year };
      if (dateMode === 'month' && selectedMonth !== 0) params.month = selectedMonth;
      const rows = await getActivityLog(params);
      setActivity(Array.isArray(rows) ? rows : []);
    } catch {
      setActivity([]);
    } finally {
      setActivityLoading(false);
    }
  }, [year, selectedMonth, dateMode]);

  useEffect(() => {
    if (activeTab === 'audit') loadAudit();
  }, [activeTab, loadAudit]);

  // Period Labels
  const periodTitle = useMemo(() => {
    if (dateMode === 'range') return 'Custom Range';
    if (selectedMonth === 0) return `Full Year ${year}`;
    return `${MONTH_NAMES[selectedMonth - 1]} ${year}`;
  }, [dateMode, selectedMonth, year]);

  const periodDateRange = useMemo(() => {
    if (dateMode === 'range') {
      if (startDate && endDate) {
        return `${fmtDate(parseDate(startDate))} — ${fmtDate(parseDate(endDate))}`;
      }
      if (startDate) return `From ${fmtDate(parseDate(startDate))}`;
      if (endDate) return `Until ${fmtDate(parseDate(endDate))}`;
      return `Custom Period in ${year}`;
    }
    if (selectedMonth === 0) return `01 Jan ${year} — 31 Dec ${year}`;
    const days = new Date(year, selectedMonth, 0).getDate();
    return `01 ${MONTH_NAMES[selectedMonth - 1]} ${year} — ${days} ${MONTH_NAMES[selectedMonth - 1]} ${year}`;
  }, [dateMode, startDate, endDate, selectedMonth, year]);

  const categoryNameById = useMemo(() => {
    const map = {};
    (data?.categories || []).forEach((c) => {
      map[c.budgetCategoryId] = c.name;
    });
    return map;
  }, [data]);

  // Master Transaction List
  const yearRows = useMemo(() => {
    const rows = [];

    (data?.cashReceipts || []).forEach((r) => {
      if (Number(r.year) !== year) return;
      const d = parseDate(r.receivedDate);
      const amt = Number(r.amount) || 0;
      rows.push({
        key: `in-${r.id}`,
        type: 'in',
        month: Number(r.month) || d.getMonth() + 1,
        date: d,
        ts: d.getTime(),
        ref: r.referenceNo || `DEP-${String(r.id).padStart(5, '0')}`,
        head: r.budgetCategoryId ? categoryNameById[r.budgetCategoryId] || 'Budget Head' : 'General Office Fund',
        budgetCategoryId: r.budgetCategoryId || null,
        narration: `Cash deposit from ${r.receivedFrom || 'Management'}`,
        sub: r.note || '',
        method: r.paymentMethod || 'Cash',
        status: 'approved',
        counted: true,
        amount: amt,
        receivedBy: r.receivedBy || '',
        receivedFrom: r.receivedFrom || 'Management',
      });
    });

    expenses.forEach((e) => {
      const d = parseDate(e.date || e.expenseDate || e.createdAt);
      if (d.getFullYear() !== year) return;
      const status = String(e.status || 'pending').toLowerCase();
      const counted = status === 'approved' || (COUNT_PENDING && status === 'pending');
      rows.push({
        key: `out-${e.id}`,
        type: 'out',
        month: d.getMonth() + 1,
        date: d,
        ts: d.getTime(),
        ref: e.reference || e.voucherNo || `VCH-${String(e.id).padStart(5, '0')}`,
        head: e.budgetCategory?.name || categoryNameById[e.budgetCategoryId] || 'General Operations',
        budgetCategoryId: e.budgetCategoryId || null,
        narration: e.title || e.description || e.paidTo || 'Operational Expense',
        sub: e.paidTo ? `Paid to: ${e.paidTo}` : '',
        method: e.paymentMethod || '—',
        paymentRef: e.paymentRef || '',
        status,
        counted,
        amount: Number(e.amount) || 0,
      });
    });

    rows.sort((a, b) => (a.ts !== b.ts ? a.ts - b.ts : a.type === 'in' ? -1 : 1));
    return rows;
  }, [data, expenses, year, categoryNameById]);

  // Opening Balance calculation
  const openingBalance = useMemo(() => {
    if (dateMode === 'range') {
      if (!startDate) return 0;
      const startTs = parseDate(startDate).getTime();
      return yearRows
        .filter((r) => r.ts < startTs && r.counted)
        .reduce((s, r) => s + (r.type === 'in' ? r.amount : -r.amount), 0);
    }
    if (selectedMonth <= 1) return 0;
    return yearRows
      .filter((r) => r.month < selectedMonth && r.counted)
      .reduce((s, r) => s + (r.type === 'in' ? r.amount : -r.amount), 0);
  }, [yearRows, selectedMonth, dateMode, startDate]);

  // Running balance period rows
  const periodRows = useMemo(() => {
    let list = [];
    if (dateMode === 'range') {
      const startTs = startDate ? parseDate(startDate).getTime() : -Infinity;
      const endTs = endDate ? parseDate(endDate).getTime() + 86399999 : Infinity;
      list = yearRows.filter((r) => r.ts >= startTs && r.ts <= endTs);
    } else {
      list = yearRows.filter((r) => selectedMonth === 0 || r.month === selectedMonth);
    }

    let running = openingBalance;
    return list.map((r) => {
      if (r.counted) running += r.type === 'in' ? r.amount : -r.amount;
      return { ...r, balance: running };
    });
  }, [yearRows, selectedMonth, dateMode, startDate, endDate, openingBalance]);

  // Totals
  const totals = useMemo(() => {
    const cashIn = periodRows.filter((r) => r.type === 'in').reduce((s, r) => s + r.amount, 0);
    const cashOut = periodRows.filter((r) => r.type === 'out' && r.counted).reduce((s, r) => s + r.amount, 0);
    const pending = periodRows.filter((r) => r.type === 'out' && r.status === 'pending' && !r.counted);
    return {
      cashIn,
      cashOut,
      closing: openingBalance + cashIn - cashOut,
      depositCount: periodRows.filter((r) => r.type === 'in').length,
      outCount: periodRows.filter((r) => r.type === 'out' && r.counted).length,
      pendingCount: pending.length,
      pendingAmount: pending.reduce((s, r) => s + r.amount, 0),
    };
  }, [periodRows, openingBalance]);

  // Filtered rows for UI
  const visibleRows = useMemo(() => {
    let list = periodRows;
    if (typeFilter) list = list.filter((r) => r.type === typeFilter);
    if (categoryFilter) list = list.filter((r) => String(r.budgetCategoryId) === String(categoryFilter));
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (r) =>
          r.ref?.toLowerCase().includes(q) ||
          r.narration?.toLowerCase().includes(q) ||
          r.sub?.toLowerCase().includes(q) ||
          r.head?.toLowerCase().includes(q) ||
          r.method?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [periodRows, typeFilter, categoryFilter, searchTerm]);

  const isFiltered = Boolean(typeFilter || categoryFilter || searchTerm.trim());

  const visibleTotals = useMemo(
    () => ({
      cashIn: visibleRows.filter((r) => r.type === 'in').reduce((s, r) => s + r.amount, 0),
      cashOut: visibleRows.filter((r) => r.type === 'out' && r.counted).reduce((s, r) => s + r.amount, 0),
    }),
    [visibleRows]
  );

  const depositRows = useMemo(() => periodRows.filter((r) => r.type === 'in'), [periodRows]);

  const headRows = useMemo(() => {
    if (!data) return [];
    return data.categories.map((cat) => {
      const idx = selectedMonth - 1;
      const allocated =
        selectedMonth === 0 || dateMode === 'range'
          ? Number(cat.allocatedAmount || 0)
          : Number(cat.allocatedByMonth?.[idx] || 0);
      const spent =
        selectedMonth === 0 || dateMode === 'range'
          ? Number(cat.spentAmount || 0)
          : Number(cat.spentByMonth?.[idx] || 0);
      return { id: cat.budgetCategoryId, name: cat.name, allocated, spent, remaining: allocated - spent };
    });
  }, [data, selectedMonth, dateMode]);

  const headTotals = useMemo(
    () =>
      headRows.reduce(
        (a, h) => ({
          allocated: a.allocated + h.allocated,
          spent: a.spent + h.spent,
          remaining: a.remaining + h.remaining,
        }),
        { allocated: 0, spent: 0, remaining: 0 }
      ),
    [headRows]
  );

  // Quick Preset Actions
  const handleSelectCurrentMonth = () => {
    setDateMode('month');
    setYear(currentYear);
    setSelectedMonth(currentMonth);
    setStartDate('');
    setEndDate('');
  };

  const handleSelectLastMonth = () => {
    setDateMode('month');
    if (currentMonth === 1) {
      setYear(currentYear - 1);
      setSelectedMonth(12);
    } else {
      setYear(currentYear);
      setSelectedMonth(currentMonth - 1);
    }
    setStartDate('');
    setEndDate('');
  };

  const handleSelectFullYear = () => {
    setDateMode('month');
    setSelectedMonth(0);
    setStartDate('');
    setEndDate('');
  };

  // =====================================================================
  // EXPORTS & PRINTS
  // =====================================================================
  const fileBase = `Office_Statement_${year}_${
    dateMode === 'range' ? 'Custom_Range' : selectedMonth ? MONTH_NAMES[selectedMonth - 1] : 'Full_Year'
  }`;

  const generatedAt = () =>
    `${new Date().toLocaleDateString('en-GB')} ${new Date().toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    })}`;

  const saveBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // CSV
  const exportCsv = () => {
    const L = [];
    L.push(csvText(COMPANY));
    L.push(csvText(REPORT_TITLE));
    L.push([csvText('Period'), csvText(`${periodTitle} (${periodDateRange})`)].join(','));
    L.push([csvText('Generated'), csvText(generatedAt())].join(','));
    L.push([csvText('Reference'), csvText(statementHash)].join(','));
    if (isFiltered) L.push([csvText('Note'), csvText('Filtered view — balance reflects full filtered period')].join(','));
    L.push('');
    L.push([csvText('Opening Balance (BDT)'), openingBalance.toFixed(2)].join(','));
    L.push([csvText('Total Cash In (BDT)'), totals.cashIn.toFixed(2)].join(','));
    L.push([csvText('Total Cash Out (BDT)'), totals.cashOut.toFixed(2)].join(','));
    L.push([csvText('Remaining Balance (BDT)'), totals.closing.toFixed(2)].join(','));
    L.push('');
    L.push([
      'SL',
      'Date',
      'Ref',
      'Head of Account',
      'Description',
      'Method',
      'Status',
      'Cash In (BDT)',
      'Cash Out (BDT)',
      'Balance (BDT)',
    ].join(','));
    L.push(['', '', 'OPENING', '', csvText('Opening Balance'), '', '', '', '', openingBalance.toFixed(2)].join(','));
    visibleRows.forEach((r, i) => {
      L.push(
        [
          i + 1,
          csvText(fmtDate(r.date)),
          csvText(r.ref),
          csvText(r.head),
          csvText(r.sub ? `${r.narration} (${r.sub})` : r.narration),
          csvText(r.method),
          csvText(statusLabel(r)),
          r.type === 'in' ? r.amount.toFixed(2) : '',
          r.type === 'out' ? r.amount.toFixed(2) : '',
          r.balance.toFixed(2),
        ].join(',')
      );
    });
    L.push('');
    L.push([
      '',
      '',
      '',
      '',
      csvText('TOTAL'),
      '',
      '',
      (isFiltered ? visibleTotals.cashIn : totals.cashIn).toFixed(2),
      (isFiltered ? visibleTotals.cashOut : totals.cashOut).toFixed(2),
      totals.closing.toFixed(2),
    ].join(','));
    saveBlob(new Blob(['\uFEFF' + L.join('\r\n')], { type: 'text/csv;charset=utf-8;' }), `${fileBase}.csv`);
  };

  // Excel
  const exportExcel = async () => {
    const XLSX = await import('xlsx');
    const wb = XLSX.utils.book_new();

    const finish = (ws, widths) => {
      ws['!cols'] = widths.map((w) => ({ wch: w }));
      Object.keys(ws).forEach((addr) => {
        if (addr[0] === '!') return;
        const c = ws[addr];
        if (c.t === 'n') c.z = '#,##0.00';
        if (c.t === 'd') c.z = 'dd-mmm-yyyy';
      });
      return ws;
    };

    const aoa = [
      [COMPANY],
      [REPORT_TITLE],
      [`Period: ${periodTitle} (${periodDateRange})`],
      [`Generated: ${generatedAt()}`],
      [`Reference: ${statementHash}`],
      [],
      ['Opening Balance (BDT)', '', '', openingBalance],
      ['Total Cash In (BDT)', '', '', totals.cashIn],
      ['Total Cash Out (BDT)', '', '', totals.cashOut],
      ['Remaining Balance (BDT)', '', '', totals.closing],
      [],
      ['SL', 'Date', 'Ref', 'Head of Account', 'Description', 'Method', 'Status', 'Cash In (BDT)', 'Cash Out (BDT)', 'Balance (BDT)'],
      ['', '', 'OPENING', '', 'Opening Balance', '', '', '', '', openingBalance],
    ];
    visibleRows.forEach((r, i) => {
      aoa.push([
        String(i + 1),
        r.date,
        r.ref,
        r.head,
        r.sub ? `${r.narration} (${r.sub})` : r.narration,
        r.method,
        statusLabel(r),
        r.type === 'in' ? r.amount : '',
        r.type === 'out' ? r.amount : '',
        r.balance,
      ]);
    });
    aoa.push([]);
    aoa.push([
      '',
      '',
      '',
      '',
      'TOTAL',
      '',
      '',
      isFiltered ? visibleTotals.cashIn : totals.cashIn,
      isFiltered ? visibleTotals.cashOut : totals.cashOut,
      totals.closing,
    ]);

    const ws1 = XLSX.utils.aoa_to_sheet(aoa, { cellDates: true });
    finish(ws1, [8, 14, 16, 24, 46, 14, 11, 17, 17, 19]);
    XLSX.utils.book_append_sheet(wb, ws1, 'Statement');

    const dep = [['SL', 'Date', 'Ref', 'Received From', 'Fund / Head', 'Method', 'Note', 'Received By', 'Amount (BDT)']];
    depositRows.forEach((r, i) => {
      dep.push([String(i + 1), r.date, r.ref, r.receivedFrom, r.head, r.method, r.sub, r.receivedBy, r.amount]);
    });
    dep.push([]);
    dep.push(['', '', '', '', '', '', '', 'TOTAL', totals.cashIn]);
    XLSX.utils.book_append_sheet(
      wb,
      finish(XLSX.utils.aoa_to_sheet(dep, { cellDates: true }), [6, 14, 16, 24, 24, 14, 30, 18, 17]),
      'Cash Deposits'
    );

    const heads = [['Budget Head', 'Budget Allocated (BDT)', 'Spent (BDT)', 'Budget Left (BDT)']];
    headRows.forEach((h) => heads.push([h.name, h.allocated, h.spent, h.remaining]));
    heads.push([]);
    heads.push(['TOTAL', headTotals.allocated, headTotals.spent, headTotals.remaining]);
    XLSX.utils.book_append_sheet(wb, finish(XLSX.utils.aoa_to_sheet(heads), [32, 22, 18, 18]), 'Budget Heads');

    XLSX.writeFile(wb, `${fileBase}.xlsx`);
  };

  // PDF
  const exportPdf = async () => {
    const [{ default: JsPDF }, autoTableModule] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
    const autoTable = autoTableModule.default || autoTableModule.autoTable;
    const logoImg = await loadImageDataUrl(logo);

    const doc = new JsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const M = 12;

    let textX = M;
    if (logoImg) {
      const h = 13;
      const w = Math.min(26, (logoImg.w / logoImg.h) * h);
      doc.addImage(logoImg.url, 'PNG', M, 9, w, h);
      textX = M + w + 4;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text(COMPANY, textX, 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(REPORT_TITLE, textX, 19);
    doc.text('Currency: BDT', textX, 23);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`Period: ${periodTitle}`, pageW - M, 13, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(periodDateRange, pageW - M, 18, { align: 'right' });
    doc.text(`Generated: ${generatedAt()}`, pageW - M, 22.5, { align: 'right' });
    doc.text(`Ref: ${statementHash}`, pageW - M, 27, { align: 'right' });

    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.4);
    doc.line(M, 29, pageW - M, 29);

    // Summary boxes
    const boxes = [
      { label: 'OPENING BALANCE', value: signedPlain(openingBalance), color: [15, 23, 42] },
      { label: 'TOTAL CASH IN', value: signedPlain(totals.cashIn), color: [5, 150, 105] },
      { label: 'TOTAL CASH OUT', value: signedPlain(totals.cashOut), color: [225, 29, 72] },
      { label: 'REMAINING BALANCE', value: signedPlain(totals.closing), color: totals.closing < 0 ? [225, 29, 72] : [15, 23, 42] },
    ];
    const gap = 3.5;
    const boxW = (pageW - M * 2 - gap * 3) / 4;
    boxes.forEach((b, i) => {
      const x = M + i * (boxW + gap);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(x, 32, boxW, 14, 1.5, 1.5, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text(b.label, x + 3.5, 36.5);
      doc.setFontSize(10.5);
      doc.setTextColor(...b.color);
      doc.text(b.value, x + 3.5, 43);
    });

    let startY = 50;
    if (isFiltered || totals.pendingCount > 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(180, 83, 9);
      const notes = [];
      if (isFiltered) notes.push('Filtered view: balance column tracks full period transactions.');
      if (totals.pendingCount > 0) {
        notes.push(`${totals.pendingCount} pending expense(s) (BDT ${num(totals.pendingAmount)}) not deducted until approved.`);
      }
      doc.text(notes.join('  '), M, 49);
      startY = 52;
    }

    const body = [
      [
        { content: '-', styles: { halign: 'center' } },
        dateMode === 'range' && startDate ? fmtDate(parseDate(startDate)) : `01/${selectedMonth ? String(selectedMonth).padStart(2, '0') : '01'}/${year}`,
        'OPENING', '-', 'Opening Balance', '-', '', '', '',
        { content: num(openingBalance), styles: { halign: 'right', fontStyle: 'bold' } },
      ],
      ...visibleRows.map((r, i) => [
        { content: String(i + 1), styles: { halign: 'center' } },
        fmtDate(r.date),
        r.ref,
        r.head,
        r.sub ? `${r.narration} (${r.sub})` : r.narration,
        r.paymentRef ? `${r.method} - ${r.paymentRef}` : r.method,
        statusLabel(r),
        { content: r.type === 'in' ? num(r.amount) : '', styles: { halign: 'right', textColor: [5, 150, 105], fontStyle: 'bold' } },
        {
          content: r.type === 'out' ? num(r.amount) : '',
          styles: { halign: 'right', fontStyle: 'bold', textColor: r.counted ? [225, 29, 72] : [148, 163, 184] },
        },
        {
          content: (r.balance < 0 ? '-' : '') + num(Math.abs(r.balance)),
          styles: { halign: 'right', fontStyle: 'bold', textColor: r.balance < 0 ? [225, 29, 72] : [15, 23, 42] },
        },
      ]),
    ];

    autoTable(doc, {
      startY,
      margin: { left: M, right: M, top: 12, bottom: 15 },
      head: [['SL', 'Date', 'Ref', 'Head', 'Description', 'Method', 'Status', 'Cash In', 'Cash Out', 'Balance']],
      body,
      foot: [
        [
          { content: isFiltered ? 'TOTAL (Filtered Rows)' : 'TOTAL / REMAINING BALANCE', colSpan: 7, styles: { halign: 'right' } },
          { content: num(isFiltered ? visibleTotals.cashIn : totals.cashIn), styles: { halign: 'right' } },
          { content: num(isFiltered ? visibleTotals.cashOut : totals.cashOut), styles: { halign: 'right' } },
          { content: (totals.closing < 0 ? '-' : '') + num(Math.abs(totals.closing)), styles: { halign: 'right' } },
        ],
      ],
      showFoot: 'lastPage',
      theme: 'grid',
      styles: { font: 'helvetica', fontSize: 7.5, cellPadding: 1.8, lineColor: [226, 232, 240], lineWidth: 0.1, textColor: [30, 41, 59], valign: 'middle' },
      headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold', halign: 'left', fontSize: 7.5 },
      footStyles: { fillColor: [241, 245, 249], textColor: [15, 23, 42], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      columnStyles: {
        0: { cellWidth: 8 },
        1: { cellWidth: 20 },
        2: { cellWidth: 22 },
        3: { cellWidth: 28 },
        4: { cellWidth: 'auto' },
        5: { cellWidth: 20 },
        6: { cellWidth: 16 },
        7: { cellWidth: 24, halign: 'right' },
        8: { cellWidth: 24, halign: 'right' },
        9: { cellWidth: 26, halign: 'right' },
      },
    });

    let y = doc.lastAutoTable.finalY + 20;
    if (y > pageH - 26) {
      doc.addPage();
      y = 35;
    }
    const sigW = (pageW - M * 2 - 20) / 3;
    [
      ['Accounts Department', 'Prepared By'],
      ['Internal Audit', 'Checked & Verified'],
      ['Managing Director', 'Authorized Officer'],
    ].forEach(([name, role], i) => {
      const x = M + i * (sigW + 10);
      doc.setDrawColor(100, 116, 139);
      doc.setLineWidth(0.2);
      doc.setLineDashPattern([1, 1], 0);
      doc.line(x, y, x + sigW, y);
      doc.setLineDashPattern([], 0);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(30, 41, 59);
      doc.text(name, x + sigW / 2, y + 4, { align: 'center' });
      doc.setFontSize(6);
      doc.setTextColor(148, 163, 184);
      doc.text(role.toUpperCase(), x + sigW / 2, y + 7.5, { align: 'center' });
    });

    const pages = doc.getNumberOfPages();
    for (let p = 1; p <= pages; p += 1) {
      doc.setPage(p);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.line(M, pageH - 9, pageW - M, pageH - 9);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`${COMPANY} — ${REPORT_TITLE} — ${statementHash}`, M, pageH - 5.5);
      doc.text(`Page ${p} of ${pages}`, pageW - M, pageH - 5.5, { align: 'right' });
    }

    doc.save(`${fileBase}.pdf`);
  };

  const runExport = async (kind) => {
    setExportOpen(false);
    setExportError('');
    setExporting(kind);
    try {
      if (kind === 'pdf') await exportPdf();
      else if (kind === 'xlsx') await exportExcel();
      else exportCsv();
    } catch (err) {
      console.error('Export failed:', err);
      setExportError(`Export failed: ${err.message || 'unknown error'}`);
    } finally {
      setExporting('');
    }
  };

  const nothingToExport = loading || (periodRows.length === 0 && openingBalance === 0);

  const StatusPill = ({ r }) => {
    const label = statusLabel(r);
    if (label === 'Received' || label === 'Paid') {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 size={10} /> {label}
        </span>
      );
    }
    if (label === 'Pending') {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          <Clock size={10} /> Pending
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
        <XCircle size={10} /> Rejected
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 pb-12 print:bg-white print:pb-0">
      {/* Precision Print Styling */}
      <style>{`
        @media print {
          body, html {
            background-color: #ffffff !important;
            color: #0f172a !important;
            font-size: 10.5px !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          @page {
            size: A4 landscape;
            margin: 8mm 10mm;
          }
          .print-hidden {
            display: none !important;
          }
          .print-full-width {
            max-width: 100% !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
          }
          .print-visible-block {
            display: block !important;
          }
          .print-avoid-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          thead {
            display: table-header-group !important;
          }
          tfoot {
            display: table-footer-group !important;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

      {/* Screen Only Navbars */}
      <div className="print-hidden">
        <Topbar />
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 print-full-width">
        <div className="print-hidden">
          <Breadcrumb
            items={[
              { label: 'Dashboard', to: '/dashboard' },
              { label: 'Accounts & Finance', to: '/accounts-module/office-budget' },
              { label: 'Office Expense Statement' },
            ]}
          />
        </div>

        {/* Action Header */}
        <div className="mt-3 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 print-hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center p-1.5 shadow-2xs">
              <img src={logo} alt="Logo" className="max-h-full max-w-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-slate-900 tracking-tight">Office Cash Statement</h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {statementHash}
                </span>
              </div>
              <p className="text-xs text-slate-500"></p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/accounts-module/office-budget')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition"
            >
              <ArrowLeft size={13} /> Budget Planner
            </button>

            {/* Download Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setExportOpen((o) => !o)}
                disabled={nothingToExport || Boolean(exporting)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition disabled:opacity-40"
              >
                {exporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} className="text-emerald-600" />}
                {exporting ? 'Exporting…' : 'Download'}
                <ChevronDown size={12} />
              </button>

              {exportOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setExportOpen(false)} />
                  <div className="absolute right-0 mt-1 w-52 bg-white border border-slate-200 rounded-xl shadow-xl z-30 overflow-hidden divide-y divide-slate-100">
                    <button
                      type="button"
                      onClick={() => runExport('pdf')}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-50 text-xs font-medium text-slate-800"
                    >
                      <FileDown size={14} className="text-rose-600" /> PDF Statement
                    </button>
                    <button
                      type="button"
                      onClick={() => runExport('xlsx')}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-50 text-xs font-medium text-slate-800"
                    >
                      <FileSpreadsheet size={14} className="text-emerald-600" /> Excel Spreadsheet
                    </button>
                    <button
                      type="button"
                      onClick={() => runExport('csv')}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-50 text-xs font-medium text-slate-800"
                    >
                      <FileText size={14} className="text-slate-500" /> Plain CSV
                    </button>
                  </div>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-2xs transition"
            >
              <Printer size={13} /> Print
            </button>
          </div>
        </div>

        {exportError && (
          <div className="mb-3 bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-center gap-2 text-rose-800 text-xs print-hidden">
            <AlertCircle size={15} className="text-rose-600 shrink-0" />
            <span>{exportError}</span>
            <button onClick={() => setExportError('')} className="ml-auto font-semibold underline">
              Dismiss
            </button>
          </div>
        )}

        {error && (
          <div className="mb-3 bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-center gap-2 text-rose-800 text-xs print-hidden">
            <AlertCircle size={15} className="text-rose-600 shrink-0" />
            <span>{error}</span>
            <button onClick={loadData} className="ml-auto inline-flex items-center gap-1 font-semibold underline">
              <RotateCcw size={12} /> Retry
            </button>
          </div>
        )}

        {/* MAIN CONTAINER */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden print-full-width">
          {/* PRINT-ONLY HEADER */}
          <div className="hidden print:block border-b border-slate-300 pb-3 mb-4">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <img src={logo} alt="Logo" className="w-10 h-10 object-contain" />
                <div>
                  <h2 className="text-base font-black uppercase text-slate-900 tracking-tight">{COMPANY}</h2>
                  <p className="text-xs text-slate-600 font-semibold">{REPORT_TITLE} • BDT (৳)</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs font-bold text-slate-900">{periodTitle}</div>
                <div className="text-[10px] text-slate-500">{periodDateRange}</div>
                <div className="text-[9px] text-slate-400 font-mono mt-0.5">Ref: {statementHash} • Generated: {generatedAt()}</div>
              </div>
            </div>
          </div>

          {/* ===== COMPACT 4-STAT KPI STRIP ===== */}
          <div className="p-4 sm:p-5 border-b border-slate-100 bg-gradient-to-b from-slate-50/60 to-white">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Card 1: Opening */}
              <div className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Opening Balance</span>
                  <span className="text-[10px] font-semibold text-slate-400">
                    {dateMode === 'range' || selectedMonth > 1 ? 'Brought forward' : 'Year Start'}
                  </span>
                </div>
                <div className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 mt-1">
                  {signed(openingBalance)}
                </div>
              </div>

              {/* Card 2: Cash In */}
              <div className="p-3.5 rounded-xl border border-emerald-200/80 bg-emerald-50/30 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1">
                    <ArrowDownLeft size={12} /> Total Cash In
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/60 px-1.5 py-0.2 rounded">
                    {totals.depositCount} dep
                  </span>
                </div>
                <div className="text-lg sm:text-xl font-bold tracking-tight text-emerald-700 mt-1">
                  ৳{formatMoney(totals.cashIn)}
                </div>
              </div>

              {/* Card 3: Cash Out */}
              <div className="p-3.5 rounded-xl border border-rose-200/80 bg-rose-50/30 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1">
                    <ArrowUpRight size={12} /> Total Cash Out
                  </span>
                  <span className="text-[10px] font-semibold text-rose-700 bg-rose-100/60 px-1.5 py-0.2 rounded">
                    {totals.outCount} exp
                  </span>
                </div>
                <div className="text-lg sm:text-xl font-bold tracking-tight text-rose-700 mt-1">
                  ৳{formatMoney(totals.cashOut)}
                </div>
              </div>

              {/* Card 4: Closing */}
              <div
                className={`p-3.5 rounded-xl border shadow-2xs ${
                  totals.closing < 0 ? 'border-rose-300 bg-rose-50/70' : 'border-slate-800 bg-slate-900 text-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider ${
                      totals.closing < 0 ? 'text-rose-700' : 'text-slate-300'
                    }`}
                  >
                    Remaining Balance
                  </span>
                  <span
                    className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded ${
                      totals.closing < 0 ? 'bg-rose-200 text-rose-800' : 'bg-emerald-500/20 text-emerald-300'
                    }`}
                  >
                    {totals.closing < 0 ? 'Shortfall' : 'Available'}
                  </span>
                </div>
                <div
                  className={`text-lg sm:text-xl font-bold tracking-tight mt-1 ${
                    totals.closing < 0 ? 'text-rose-700' : 'text-white'
                  }`}
                >
                  {signed(totals.closing)}
                </div>
              </div>
            </div>

            {totals.pendingCount > 0 && (
              <div className="mt-2.5 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200/80 text-amber-800 text-[11px]">
                <Clock size={12} className="text-amber-600 shrink-0" />
                <span>
                  <strong>{totals.pendingCount} pending payment(s)</strong> (৳{formatMoney(totals.pendingAmount)}) not yet
                  deducted — deducted upon approval.
                </span>
              </div>
            )}
          </div>

          {/* ===== COMPACT UNIFIED CONTROL BAR (PRINT-HIDDEN) ===== */}
          <div className="p-3 border-b border-slate-200/80 bg-white print-hidden flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Left: Period & Quick Filters */}
            <div className="flex flex-wrap items-center gap-1.5">
              {/* Year arrows */}
              <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                <button
                  type="button"
                  onClick={() => setYear((y) => y - 1)}
                  className="px-2 py-1 text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 border-r border-slate-200"
                >
                  <ChevronLeft size={13} />
                </button>
                <span className="px-2.5 py-1 text-xs font-bold text-slate-800">{year}</span>
                <button
                  type="button"
                  onClick={() => setYear((y) => y + 1)}
                  className="px-2 py-1 text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 border-l border-slate-200"
                >
                  <ChevronRight size={13} />
                </button>
              </div>

              {/* Month Dropdown */}
              <select
                value={dateMode === 'range' ? 'custom' : selectedMonth}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'custom') {
                    setDateMode('range');
                  } else {
                    setDateMode('month');
                    setSelectedMonth(Number(val));
                  }
                }}
                className="py-1 px-2.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg text-slate-700 shadow-2xs cursor-pointer focus:ring-1 focus:ring-slate-900"
              >
                <option value={0}>Full Year ({year})</option>
                {MONTH_NAMES.map((m, idx) => (
                  <option key={m} value={idx + 1}>
                    {m} {idx + 1 === currentMonth && year === currentYear ? '• Current' : ''}
                  </option>
                ))}
                <option value="custom">📅 Custom Date Range</option>
              </select>

              {/* Quick tags */}
              <button
                type="button"
                onClick={handleSelectCurrentMonth}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  dateMode === 'month' && selectedMonth === currentMonth && year === currentYear
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                This Month
              </button>
              <button
                type="button"
                onClick={handleSelectLastMonth}
                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200"
              >
                Last Month
              </button>
              <button
                type="button"
                onClick={handleSelectFullYear}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                  dateMode === 'month' && selectedMonth === 0 ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Full Year
              </button>

              {/* Custom Date Inputs if range is selected */}
              {dateMode === 'range' && (
                <div className="flex items-center gap-1.5 ml-1 bg-slate-100 p-1 rounded-lg">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-2 py-0.5 text-xs bg-white border border-slate-200 rounded text-slate-700"
                  />
                  <span className="text-slate-400 text-xs">to</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="px-2 py-0.5 text-xs bg-white border border-slate-200 rounded text-slate-700"
                  />
                  {(startDate || endDate) && (
                    <button
                      type="button"
                      onClick={() => {
                        setStartDate('');
                        setEndDate('');
                      }}
                      className="p-1 hover:text-rose-600"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Right: Tab Strip */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('statement')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'statement' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Statement <span className="text-[10px] bg-slate-200/80 px-1.5 rounded-full">{periodRows.length}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('deposits')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'deposits' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Deposits <span className="text-[10px] bg-slate-200/80 px-1.5 rounded-full">{depositRows.length}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('heads')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  activeTab === 'heads' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Budget Heads
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('audit')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                  activeTab === 'audit' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Audit Trail
              </button>
            </div>
          </div>

          {/* Sub-toolbar for filters if statement is open */}
          {activeTab === 'statement' && (
            <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/30 flex flex-wrap items-center justify-between gap-2 print-hidden">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span className="font-semibold text-slate-700">{periodTitle}:</span>
                <span>{periodDateRange}</span>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative w-44">
                  <Search size={12} className="absolute left-2.5 top-2 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search ref, desc…"
                    className="w-full pl-7 pr-2.5 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                  />
                </div>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="py-1 px-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-700"
                >
                  <option value="">In + Out</option>
                  <option value="in">Cash In</option>
                  <option value="out">Cash Out</option>
                </select>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="py-1 px-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 max-w-[130px] truncate"
                >
                  <option value="">All Heads</option>
                  {data?.categories?.map((c) => (
                    <option key={c.budgetCategoryId} value={c.budgetCategoryId}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* ===== TAB 1: STATEMENT TABLE ===== */}
          {activeTab === 'statement' && (
            <div className="overflow-x-visible">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/90 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-600 print:bg-slate-100 print:border-slate-400">
                    <th className="py-2.5 px-3 w-10 text-center">SL</th>
                    <th className="py-2.5 px-3 w-24">Date</th>
                    <th className="py-2.5 px-3 w-28">Ref</th>
                    <th className="py-2.5 px-3 w-32">Head</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3 w-24">Method</th>
                    <th className="py-2.5 px-3 w-20 text-center">Status</th>
                    <th className="py-2.5 px-3 text-right w-28 text-emerald-700">Cash In (৳)</th>
                    <th className="py-2.5 px-3 text-right w-28 text-rose-700">Cash Out (৳)</th>
                    <th className="py-2.5 px-3 text-right w-32">Balance (৳)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 print:divide-slate-200">
                  {/* Opening Balance Row */}
                  <tr className="bg-slate-50/70 font-semibold text-slate-700 print:bg-transparent">
                    <td className="py-2 px-3 text-center text-slate-400">—</td>
                    <td className="py-2 px-3 font-mono text-[11px]">
                      {dateMode === 'range' && startDate
                        ? fmtDate(parseDate(startDate))
                        : `01/${selectedMonth ? String(selectedMonth).padStart(2, '0') : '01'}/${year}`}
                    </td>
                    <td className="py-2 px-3 font-mono text-[11px] font-bold text-slate-500">OPENING</td>
                    <td className="py-2 px-3 text-slate-400">—</td>
                    <td className="py-2 px-3 font-bold text-slate-900">Opening Balance</td>
                    <td className="py-2 px-3 text-slate-400">—</td>
                    <td className="py-2 px-3" />
                    <td className="py-2 px-3 text-right text-slate-300">—</td>
                    <td className="py-2 px-3 text-right text-slate-300">—</td>
                    <td className="py-2 px-3 text-right font-bold text-slate-900">{signed(openingBalance)}</td>
                  </tr>

                  {loading ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
                        Loading statement…
                      </td>
                    </tr>
                  ) : visibleRows.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-slate-400">
                        No transactions found for {periodTitle}.
                      </td>
                    </tr>
                  ) : (
                    visibleRows.map((r, idx) => {
                      const dead = r.type === 'out' && !r.counted;
                      return (
                        <tr
                          key={r.key}
                          className={`hover:bg-slate-50/70 transition print-avoid-break ${
                            r.type === 'in' ? 'bg-emerald-50/30' : ''
                          } ${r.status === 'rejected' ? 'opacity-50' : ''}`}
                        >
                          <td className="py-2 px-3 text-center text-slate-400 text-[11px]">{idx + 1}</td>
                          <td className="py-2 px-3 text-slate-700 whitespace-nowrap text-[11px]">{fmtDate(r.date)}</td>
                          <td className={`py-2 px-3 font-bold text-[11px] ${r.type === 'in' ? 'text-emerald-700' : 'text-slate-800'}`}>
                            {r.ref}
                          </td>
                          <td className="py-2 px-3">
                            <span className="inline-block px-1.5 py-0.5 bg-slate-100 rounded text-slate-800 text-[11px] print:p-0 print:bg-transparent">
                              {r.head}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-700">
                            <div className={`font-medium text-slate-900 ${r.status === 'rejected' ? 'line-through' : ''}`}>
                              {r.narration}
                            </div>
                            {r.sub && <div className="text-[10px] text-slate-400">{r.sub}</div>}
                          </td>
                          <td className="py-2 px-3 text-[11px] text-slate-700">
                            {r.method}
                            {r.paymentRef && <div className="text-[10px] text-slate-400 font-mono">{r.paymentRef}</div>}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <StatusPill r={r} />
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-emerald-700">
                            {r.type === 'in' ? `৳${formatMoney(r.amount)}` : ''}
                          </td>
                          <td className={`py-2 px-3 text-right font-bold ${dead ? 'text-slate-400 line-through' : 'text-rose-600'}`}>
                            {r.type === 'out' ? `৳${formatMoney(r.amount)}` : ''}
                          </td>
                          <td className={`py-2 px-3 text-right font-bold ${r.balance < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                            {signed(r.balance)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-900 text-white font-semibold print:bg-slate-100 print:text-slate-900 print:border-t-2 print:border-slate-800">
                    <td colSpan={7} className="py-2.5 px-3 text-right uppercase text-[10px] tracking-wider text-slate-300 print:text-slate-700">
                      {isFiltered ? 'Totals (Filtered Rows)' : 'Totals / Remaining Balance'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-300 print:text-slate-900">
                      ৳{formatMoney(isFiltered ? visibleTotals.cashIn : totals.cashIn)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-rose-300 print:text-slate-900">
                      ৳{formatMoney(isFiltered ? visibleTotals.cashOut : totals.cashOut)}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-bold ${
                        totals.closing < 0 ? 'text-rose-300' : 'text-emerald-300'
                      } print:text-slate-900`}
                    >
                      {signed(totals.closing)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* ===== TAB 2: CASH DEPOSITS ===== */}
          {activeTab === 'deposits' && (
            <div className="overflow-x-visible">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/90 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                    <th className="py-2.5 px-3 w-10 text-center">SL</th>
                    <th className="py-2.5 px-3 w-28">Date</th>
                    <th className="py-2.5 px-3 w-28">Ref</th>
                    <th className="py-2.5 px-3">Received From</th>
                    <th className="py-2.5 px-3 w-36">Fund / Head</th>
                    <th className="py-2.5 px-3 w-24">Method</th>
                    <th className="py-2.5 px-3">Note</th>
                    <th className="py-2.5 px-3 w-28">Received By</th>
                    <th className="py-2.5 px-3 text-right w-32 text-emerald-700">Amount (৳)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {depositRows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        No deposits recorded in this period.
                      </td>
                    </tr>
                  ) : (
                    depositRows.map((r, idx) => (
                      <tr key={r.key} className="hover:bg-slate-50/70 transition">
                        <td className="py-2 px-3 text-center text-slate-400 text-[11px]">{idx + 1}</td>
                        <td className="py-2 px-3 whitespace-nowrap text-[11px]">{fmtDate(r.date)}</td>
                        <td className="py-2 px-3 font-bold text-emerald-700">{r.ref}</td>
                        <td className="py-2 px-3 font-medium text-slate-900">{r.receivedFrom}</td>
                        <td className="py-2 px-3">
                          <span className="inline-block px-1.5 py-0.5 bg-slate-100 rounded text-[11px]">{r.head}</span>
                        </td>
                        <td className="py-2 px-3 text-[11px]">{r.method}</td>
                        <td className="py-2 px-3 text-slate-500">{r.sub || '—'}</td>
                        <td className="py-2 px-3 text-slate-500">{r.receivedBy || '—'}</td>
                        <td className="py-2 px-3 text-right font-bold text-emerald-700">৳{formatMoney(r.amount)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-900 text-white font-semibold">
                    <td colSpan={8} className="py-2.5 px-3 text-right uppercase text-[10px] tracking-wider text-slate-300">
                      Total Cash Deposits
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-300">৳{formatMoney(totals.cashIn)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* ===== TAB 3: BUDGET HEADS ===== */}
          {activeTab === 'heads' && (
            <div className="overflow-x-visible">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/90 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                    <th className="py-2.5 px-3">Budget Head</th>
                    <th className="py-2.5 px-3 text-right">Allocated (৳)</th>
                    <th className="py-2.5 px-3 text-right">Spent (৳)</th>
                    <th className="py-2.5 px-3 text-right">Remaining (৳)</th>
                    <th className="py-2.5 px-3 w-40">Utilization</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {headRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400">
                        No budget categories found.
                      </td>
                    </tr>
                  ) : (
                    headRows.map((h) => {
                      const pct = h.allocated > 0 ? (h.spent / h.allocated) * 100 : 0;
                      const over = h.remaining < 0;
                      return (
                        <tr key={h.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-2.5 px-3 font-bold text-slate-900">{h.name}</td>
                          <td className="py-2.5 px-3 text-right text-slate-700">৳{formatMoney(h.allocated)}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-rose-600">৳{formatMoney(h.spent)}</td>
                          <td className={`py-2.5 px-3 text-right font-bold ${over ? 'text-rose-600' : 'text-slate-900'}`}>
                            {signed(h.remaining)}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="w-32">
                              <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
                                <span>{pct.toFixed(0)}%</span>
                                {over && <span className="text-rose-600 font-bold">OVER</span>}
                              </div>
                              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${over ? 'bg-rose-500' : pct > 85 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                                  style={{ width: `${Math.min(100, pct)}%` }}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-900 text-white font-semibold">
                    <td className="py-2.5 px-3 uppercase text-[10px] tracking-wider text-slate-300">Total</td>
                    <td className="py-2.5 px-3 text-right">৳{formatMoney(headTotals.allocated)}</td>
                    <td className="py-2.5 px-3 text-right text-rose-300">৳{formatMoney(headTotals.spent)}</td>
                    <td
                      className={`py-2.5 px-3 text-right font-bold ${
                        headTotals.remaining < 0 ? 'text-rose-300' : 'text-emerald-300'
                      }`}
                    >
                      {signed(headTotals.remaining)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* ===== TAB 4: AUDIT LOG ===== */}
          {activeTab === 'audit' && (
            <div className="divide-y divide-slate-100 max-h-[460px] overflow-y-auto">
              {activityLoading ? (
                <div className="py-12 text-center text-slate-400 text-xs">Loading audit trail…</div>
              ) : activity.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">No activity logged for {periodTitle}.</div>
              ) : (
                activity.map((item) => (
                  <div key={item.id} className="p-3 flex items-start gap-3 hover:bg-slate-50/70 transition text-xs">
                    <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                      <Banknote size={13} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-800 font-medium">{item.message}</p>
                      <div className="mt-0.5 flex items-center gap-2 text-[10px] text-slate-400">
                        <span className="font-semibold text-slate-600">{item.module}</span>
                        <span>•</span>
                        <span>{new Date(item.createdAt).toLocaleString('en-GB')}</span>
                        <span>•</span>
                        <span>By: {item.performedBy || 'System'}</span>
                      </div>
                    </div>
                    {item.amount && <span className="font-bold text-slate-900">৳{formatMoney(item.amount)}</span>}
                  </div>
                ))
              )}
            </div>
          )}

          {/* ===== PRINT & REPORT FOOTER ===== */}
          <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50/50 print:bg-white print-avoid-break">
            <div className="flex flex-col md:flex-row justify-between items-start gap-3 text-[10px] text-slate-500 pb-3 border-b border-slate-200">
              <div className="max-w-xl">
                <span className="font-bold uppercase text-slate-600">Accounting Note:</span> Statement reflects total cash
                receipts deposited into the office operating fund and expenditures disbursed against approved vouchers.
              </div>
              <div className="font-mono text-slate-400 shrink-0">AUTHENTICATED • {statementHash}</div>
            </div>

            <div className="mt-8 pt-2 grid grid-cols-3 gap-6 text-center text-xs text-slate-600">
              {[
                ['Accounts Department', 'Prepared By'],
                ['Internal Audit', 'Checked & Verified'],
                ['Managing Director', 'Authorized Signatory'],
              ].map(([name, role]) => (
                <div key={role}>
                  <div className="border-b border-slate-300 pb-1 mb-1 font-medium text-slate-800">{name}</div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">{role}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}