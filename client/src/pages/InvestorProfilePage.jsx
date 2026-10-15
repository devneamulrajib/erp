// client/src/pages/InvestorProfilePage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Topbar from '../components/Topbar';
import InvestmentFormDrawer from '../components/InvestmentFormDrawer';
import { DocumentsTab, CommunicationTab, NotesTab, ActivityTab } from '../components/InvestorProfileTabs';
import { PaymentsTab, BankAccountsTab } from '../components/InvestorPaymentsTabs';
import {
  getDashboardSummary,
  getInvestors,
  getInvestorPhoto,
  uploadInvestorPhoto,
  deleteInvestorPhoto,
} from '../api/investor';

/* ------------------------------------------------------------------ */
/* Routes: adjust these to match your router                           */
/* ------------------------------------------------------------------ */

const ROUTES = {
  list: '/investors',
  // The list page opens its edit modal for this investor when it sees ?edit=<id>
  edit: (id) => `/investors?edit=${id}`,
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const formatBDT = (amount) => `৳ ${Number(amount || 0).toLocaleString('en-IN')}`;

const formatDate = (value) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatDateTime = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}, ${d.toLocaleTimeString(
    'en-GB',
    { hour: '2-digit', minute: '2-digit', hour12: true }
  )}`;
};

const humanize = (value) => {
  const s = String(value || '').replace(/_/g, ' ').trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
};

const toList = (res) => {
  const list = res?.data ?? res ?? [];
  return Array.isArray(list) ? list : [];
};

const num = (v) => (v === null || v === undefined || v === '' || Number.isNaN(Number(v)) ? null : Number(v));

const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const PHOTO_MAX = 5 * 1024 * 1024;

const STATUS_STYLES = {
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  completed: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  inactive: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  matured: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  partially_returned: 'bg-amber-50 text-amber-800 ring-amber-600/25',
  fully_returned: 'bg-slate-100 text-slate-700 ring-slate-500/20',
};

const ALLOC_COLORS = ['#3B82F6', '#22C08A', '#F6B01E', '#8B5CF6', '#EF6B6B'];

const TONES = {
  amber: { box: 'bg-[#FEF6E6] border-[#FBE8C0]', icon: 'bg-[#FCE3A6] text-[#9A6A08]' },
  green: { box: 'bg-[#EAF7F1] border-[#CFEBDD]', icon: 'bg-[#C9EEDC] text-[#1B7F5A]' },
  blue: { box: 'bg-[#EAF2FE] border-[#CFE0FB]', icon: 'bg-[#CBDDFB] text-[#2563C9]' },
  purple: { box: 'bg-[#F2EEFC] border-[#E0D7F8]', icon: 'bg-[#DDD2F7] text-[#6D3FD0]' },
};

const PRINT_CSS = `
@media print {
  .no-print { display: none !important; }
  body { background: #fff !important; }
}
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
`;

/* ------------------------------------------------------------------ */
/* Icons                                                               */
/* ------------------------------------------------------------------ */

const ICONS = {
  plus: 'M12 5v14M5 12h14',
  arrowLeft: 'M19 12H5M12 19l-7-7 7-7',
  arrowUp: 'M12 19V5M5 12l7-7 7 7',
  pencil: 'M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z',
  phone:
    'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z',
  mail: 'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2ZM22 6l-10 7L2 6',
  pin: 'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0ZM12 13a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  wallet:
    'M3 7a2 2 0 0 1 2-2h13v4M3 7v12a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-3M3 7h17a1 1 0 0 1 1 1v3M21 11h-4a2 2 0 0 0 0 4h4v-4Z',
  trending: 'M22 7l-8.5 8.5-5-5L2 17M16 7h6v6',
  building: 'M3 21h18M5 21V7l7-4 7 4v14M9 9h1M14 9h1M9 13h1M14 13h1M9 17h1M14 17h1',
  calendar: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z',
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  chart: 'M3 3v18h18M7 14l4-4 3 3 5-6',
  pie: 'M21 12A9 9 0 1 1 12 3v9ZM15 3.5A9 9 0 0 1 20.5 9H15Z',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
  note: 'M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9ZM14 3v6h6M8 13h8M8 17h5',
  message: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z',
  printer: 'M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6Z',
  bolt: 'M13 2 3 14h9l-1 8 10-12h-9Z',
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
  clock: 'M12 6v6l4 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
  landmark: 'M3 21h18M5 21V10M9 21V10M15 21V10M19 21V10M2 10l10-7 10 7Z',
  folder: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z',
  activity: 'M22 12h-4l-3 9L9 3l-3 9H2',
  camera:
    'M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2ZM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
  trash: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6',
};

function Icon({ name, className = 'h-4 w-4' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={ICONS[name]} />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* UI pieces                                                           */
/* ------------------------------------------------------------------ */

const cardCls = 'rounded-xl border border-[#EEF0F4] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]';

function Skeleton({ className = '' }) {
  return <span className={`inline-block animate-pulse rounded-md bg-slate-200/80 ${className}`} />;
}

function CardTitle({ icon, children, action }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#FEF1D2] text-[#B7791F]">
          <Icon name={icon} className="h-4 w-4" />
        </span>
        <h2 className="text-[15px] font-semibold text-slate-900">{children}</h2>
      </div>
      {action}
    </div>
  );
}

function StatTile({ tone, icon, label, value, sub, subClass = 'text-slate-500', compact = false }) {
  const t = TONES[tone];
  return (
    <div className={`min-w-0 overflow-hidden rounded-xl border ${t.box} ${compact ? 'p-4' : 'p-5'}`}>
      <div className="flex items-center gap-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${t.icon}`}>
          <Icon name={icon} className="h-[18px] w-[18px]" />
        </span>
        <p className={`min-w-0 truncate font-medium text-slate-600 ${compact ? 'text-xs' : 'text-sm'}`}>{label}</p>
      </div>
      <p
        className={`mt-3 whitespace-nowrap font-bold tabular-nums tracking-tight text-slate-900 ${
          compact ? 'text-lg' : 'text-2xl'
        }`}
      >
        {value}
      </p>
      {sub && <p className={`mt-1 truncate text-xs font-medium ${subClass}`}>{sub}</p>}
    </div>
  );
}

function StatusBadge({ status }) {
  const key = status || 'active';
  return (
    <span
      className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
        STATUS_STYLES[key] || STATUS_STYLES.active
      }`}
    >
      {humanize(key)}
    </span>
  );
}

function EmptyNote({ children }) {
  return <p className="py-8 text-center text-sm text-slate-400">{children}</p>;
}

function Donut({ segments, centerTop, centerBottom }) {
  const r = 76;
  const c = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + x.amount, 0);
  let offset = 0;
  const gap = segments.length > 1 ? 3 : 0;
  return (
    <div className="relative mx-auto h-48 w-48 shrink-0">
      <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="100" cy="100" r={r} fill="none" stroke="#EEF1F5" strokeWidth="30" />
        {total > 0 &&
          segments.map((seg) => {
            const len = Math.max(0, (seg.amount / total) * c - gap);
            const el = (
              <circle
                key={seg.name}
                cx="100"
                cy="100"
                r={r}
                fill="none"
                stroke={seg.color}
                strokeWidth="30"
                strokeDasharray={`${len} ${c - len}`}
                strokeDashoffset={-offset}
              />
            );
            offset += (seg.amount / total) * c;
            return el;
          })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
        <span className="whitespace-nowrap text-base font-bold tabular-nums text-slate-900">{centerTop}</span>
        <span className="text-xs text-slate-500">{centerBottom}</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function InvestorProfilePage() {
  const navigate = useNavigate();
  const params = useParams();
  const investorId = params.id ?? params.investorId;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [investors, setInvestors] = useState([]);
  const [investorsLoaded, setInvestorsLoaded] = useState(false);

  const [activeTab, setActiveTab] = useState('overview');
  const [showInvestmentDrawer, setShowInvestmentDrawer] = useState(false);
  const [payAction, setPayAction] = useState(null);

  // Photo
  const fileRef = useRef(null);
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState('');

  const loadSummary = async () => {
    setLoading(true);
    try {
      const res = await getDashboardSummary({ investorId, projectId: '', status: '' });
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadInvestors = async () => {
    try {
      const res = await getInvestors();
      setInvestors(toList(res));
    } catch (err) {
      console.error(err);
    } finally {
      setInvestorsLoaded(true);
    }
  };

  useEffect(() => {
    loadInvestors();
  }, []);

  useEffect(() => {
    loadSummary();
  }, [investorId]);

  const investor = investors.find((i) => String(i.id) === String(investorId)) || null;

  useEffect(() => {
    if (!investor?.profileImage) {
      setPhotoUrl('');
      return undefined;
    }
    let alive = true;
    let objectUrl = '';
    getInvestorPhoto(investorId)
      .then((res) => {
        if (!alive) return;
        objectUrl = URL.createObjectURL(res.data);
        setPhotoUrl(objectUrl);
      })
      .catch(() => alive && setPhotoUrl(''));
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [investorId, investor?.profileImage]);

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setPhotoError('');
    if (!PHOTO_TYPES.includes(file.type)) {
      setPhotoError('Use a JPG, PNG or WEBP image.');
      return;
    }
    if (file.size > PHOTO_MAX) {
      setPhotoError('The photo must be 5 MB or smaller.');
      return;
    }

    setPhotoBusy(true);
    try {
      const fd = new FormData();
      fd.append('photo', file);
      await uploadInvestorPhoto(investorId, fd);
      await loadInvestors();
    } catch (err) {
      setPhotoError(err.response?.data?.message || err.message || 'Could not upload the photo.');
    } finally {
      setPhotoBusy(false);
    }
  };

  const handlePhotoRemove = async () => {
    if (!window.confirm('Remove this investor\u2019s photo?')) return;
    setPhotoError('');
    setPhotoBusy(true);
    try {
      await deleteInvestorPhoto(investorId);
      await loadInvestors();
    } catch (err) {
      setPhotoError(err.response?.data?.message || err.message || 'Could not remove the photo.');
    } finally {
      setPhotoBusy(false);
    }
  };

  const openInvestmentDrawer = () => setShowInvestmentDrawer(true);
  const openPayInvestor = () => {
    setActiveTab('payments');
    setPayAction('payout');
  };

  /* ---------------- Derived data ---------------- */

  const kpis = data?.kpis || {};
  const recentInvestments = data?.recentInvestments || [];
  const breakdown = Object.entries(data?.projectBreakdown || {}).sort(
    (a, b) => Number(b[1] || 0) - Number(a[1] || 0)
  );

  const initialLoading = (loading && !data) || !investorsLoaded;

  const lastInvestmentDate = recentInvestments
    .map((i) => i.investmentDate || i.date)
    .filter(Boolean)
    .map((d) => new Date(d))
    .filter((d) => !Number.isNaN(d.getTime()))
    .sort((a, b) => b - a)[0];

  const allocationSource = breakdown.map(([name, amount]) => ({
    name: name || 'General business',
    amount: Number(amount || 0),
  }));
  const allocationBase =
    allocationSource.length <= 4
      ? allocationSource
      : [
          ...allocationSource.slice(0, 3),
          {
            name: 'Other',
            amount: allocationSource.slice(3).reduce((s, x) => s + x.amount, 0),
          },
        ];
  const allocationTotal = allocationBase.reduce((s, x) => s + x.amount, 0);
  const allocation = allocationBase.map((x, idx) => ({
    ...x,
    color: ALLOC_COLORS[idx % ALLOC_COLORS.length],
    pct: allocationTotal > 0 ? Math.round((x.amount / allocationTotal) * 100) : 0,
  }));

  const scheduleRows = Array.isArray(data?.paymentSchedule)
    ? data.paymentSchedule.map((r) => ({
        project: r.project?.name || r.projectName || (typeof r.project === 'string' ? r.project : '') || 'General business',
        total: num(r.totalAmount ?? r.total),
        paid: num(r.paidAmount ?? r.paid),
        due: num(r.dueAmount ?? r.due),
        nextDue: r.nextDueDate ?? r.nextDue ?? null,
      }))
    : Object.values(
        recentInvestments.reduce((acc, inv) => {
          const name = inv.project?.name || inv.projectName || 'General business';
          const row = acc[name] || { project: name, total: 0, paidKnown: true, paid: 0, nextDue: null };
          row.total += Number(inv.principalAmount || inv.principal || 0);
          const paid = num(inv.paidAmount ?? inv.totalPaid);
          if (paid === null) row.paidKnown = false;
          else row.paid += paid;
          const nd = inv.nextDueDate;
          if (nd && (!row.nextDue || new Date(nd) < new Date(row.nextDue))) row.nextDue = nd;
          acc[name] = row;
          return acc;
        }, {})
      ).map((row) => ({
        project: row.project,
        total: row.total,
        paid: row.paidKnown ? row.paid : null,
        due: row.paidKnown ? Math.max(0, row.total - row.paid) : null,
        nextDue: row.nextDue,
      }));

  const knownDues = scheduleRows.filter((r) => r.due !== null);
  const pendingAmount = knownDues.reduce((s, r) => s + r.due, 0);
  const pendingProjects = knownDues.filter((r) => r.due > 0).length;
  const nextDueRow = scheduleRows
    .filter((r) => r.nextDue && (r.due === null || r.due > 0))
    .sort((a, b) => new Date(a.nextDue) - new Date(b.nextDue))[0];

  const phone = investor?.phone;
  const email = investor?.email;
  const investorCode = investor?.investorCode || investor?.code || investor?.investorId || investor?.id;
  const typeLabel = investor?.investorType || investor?.type || humanize(investor?.investmentType);

  const personalRows = [
    ['Full Name', investor?.name],
    ["Father's Name", investor?.fatherName],
    ['Date of Birth', investor?.dateOfBirth || investor?.dob ? formatDate(investor?.dateOfBirth || investor?.dob) : ''],
    ['Nationality', investor?.nationality],
    ['Occupation', investor?.occupation],
    ['TIN', investor?.tin],
    ['NID', investor?.nid || investor?.nidPassport],
  ];

  const TABS = [
    { key: 'overview', label: 'Overview', icon: 'grid' },
    { key: 'history', label: 'Investment History', icon: 'clock' },
    { key: 'payments', label: 'Payments', icon: 'wallet' },
    { key: 'bank', label: 'Bank Accounts', icon: 'landmark' },
    { key: 'documents', label: 'Documents', icon: 'folder' },
    { key: 'communication', label: 'Communication', icon: 'message' },
    { key: 'notes', label: 'Notes', icon: 'note' },
    { key: 'activity', label: 'Activity Log', icon: 'activity' },
  ];

  /* ---------------- Not found ---------------- */

  if (investorsLoaded && !investor) {
    return (
      <div className="min-h-screen bg-[#F5F6FA] text-slate-900">
        <Topbar />
        <div className="mx-auto max-w-xl px-4 pt-24 text-center">
          <h1 className="text-2xl font-bold">Investor not found</h1>
          <p className="mt-2 text-slate-500">
            This investor may have been removed, or the link is incorrect.
          </p>
          <button
            type="button"
            onClick={() => navigate(ROUTES.list)}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#F6B01E] px-5 py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-[#e9a30f]"
          >
            <Icon name="arrowLeft" />
            Back to list
          </button>
        </div>
      </div>
    );
  }

  /* ---------------- Reusable blocks ---------------- */

  const transactionsTable = (rows) => (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-[13px]">
        <thead>
          <tr className="bg-[#F7F8FB] text-xs text-slate-500">
            <th className="px-3 py-2.5 font-medium">Date</th>
            <th className="px-3 py-2.5 font-medium">Project</th>
            <th className="px-3 py-2.5 font-medium">Investment type</th>
            <th className="px-3 py-2.5 font-medium">Amount</th>
            <th className="px-3 py-2.5 font-medium">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={5}>
                <EmptyNote>No investments recorded for this investor yet.</EmptyNote>
              </td>
            </tr>
          ) : (
            rows.map((inv) => (
              <tr key={inv.id || inv.code || inv.investmentCode} className="hover:bg-[#FAFBFD]">
                <td className="whitespace-nowrap px-3 py-3 text-slate-600">
                  {formatDate(inv.investmentDate || inv.date)}
                </td>
                <td className="px-3 py-3 font-medium text-slate-800">
                  {inv.project?.name || inv.projectName || 'General business'}
                </td>
                <td className="px-3 py-3 text-slate-600">
                  {humanize(inv.investmentType) || '—'}
                </td>
                <td className="whitespace-nowrap px-3 py-3 font-medium tabular-nums text-slate-800">
                  {formatBDT(inv.principalAmount || inv.principal)}
                </td>
                <td className="px-3 py-3">
                  <StatusBadge status={inv.status} />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  const notesBody = (
    <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
      <div className="min-h-[64px] rounded-lg border border-slate-200 bg-[#FAFBFD] px-4 py-3 text-sm leading-relaxed text-slate-700">
        {investor?.notes ? (
          <p className="whitespace-pre-wrap">{investor.notes}</p>
        ) : (
          <p className="text-slate-400">No notes added for this investor.</p>
        )}
      </div>
      {(investor?.updatedAt || investor?.updatedBy) && (
        <div className="text-xs text-slate-500 sm:text-right">
          {investor?.updatedAt && (
            <>
              <p>Last updated</p>
              <p className="mt-0.5 font-medium text-slate-700">{formatDateTime(investor.updatedAt)}</p>
            </>
          )}
          {investor?.updatedBy && (
            <p className="mt-1">
              by <span className="font-medium text-slate-700">{investor.updatedBy?.name || investor.updatedBy}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );

  const secondaryBtn =
    'inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-[13px] font-medium text-slate-700 transition hover:bg-slate-50';

  const quickActions = (
    <div className="no-print mt-5 border-t border-slate-100 pt-4">
      <p className="mb-2.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
        <Icon name="bolt" className="h-3.5 w-3.5 text-[#B7791F]" />
        Quick Actions
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={openInvestmentDrawer}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#F6B01E] px-3.5 py-2 text-[13px] font-semibold text-slate-900 transition hover:bg-[#e9a30f] focus:outline-none focus:ring-2 focus:ring-[#F6B01E]/60"
        >
          <Icon name="plus" />
          Add Investment
        </button>
        <button
          type="button"
          onClick={openPayInvestor}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-2 text-[13px] font-semibold text-white transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/60"
        >
          <Icon name="wallet" />
          Pay Investor
        </button>
        <button type="button" onClick={() => setActiveTab('communication')} className={secondaryBtn}>
          <Icon name="message" />
          Send Message
        </button>
        <button type="button" onClick={() => setActiveTab('documents')} className={secondaryBtn}>
          <Icon name="note" />
          Documents
        </button>
        <button type="button" onClick={() => window.print()} className={secondaryBtn}>
          <Icon name="printer" />
          Print Profile
        </button>
      </div>
    </div>
  );

  /* ---------------- Render ---------------- */

  return (
    <div className="min-h-screen bg-[#F5F6FA] pb-16 text-slate-900 antialiased">
      <style>{PRINT_CSS}</style>
      <div className="no-print">
        <Topbar />
      </div>

      <main className="mx-auto max-w-[1280px] space-y-5 px-4 pt-6 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">
              Investor Profile
            </h1>
            <nav className="mt-1 text-sm text-slate-500" aria-label="Breadcrumb">
              <span>Home</span> <span className="mx-1 text-slate-300">/</span>
              <button
                type="button"
                onClick={() => navigate(ROUTES.list)}
                className="font-medium text-slate-700 hover:underline"
              >
                Investor
              </button>{' '}
              <span className="mx-1 text-slate-300">/</span> <span>Investor Profile</span>
            </nav>
          </div>

          <div className="no-print flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(ROUTES.list)}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#F6B01E]/40"
            >
              <Icon name="arrowLeft" />
              Back to List
            </button>
            <button
              type="button"
              onClick={() => navigate(ROUTES.edit(investorId))}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#F6B01E]/40"
            >
              <Icon name="pencil" />
              Edit
            </button>
            <button
              type="button"
              onClick={openInvestmentDrawer}
              className="inline-flex items-center gap-2 rounded-lg bg-[#F6B01E] px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-sm transition hover:bg-[#e9a30f] focus:outline-none focus:ring-2 focus:ring-[#F6B01E]/60 focus:ring-offset-2"
            >
              <Icon name="plus" />
              New Investment
            </button>
            <button
              type="button"
              onClick={openPayInvestor}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/60 focus:ring-offset-2"
            >
              <Icon name="wallet" />
              Pay Investor
            </button>
          </div>
        </div>

        {/* Profile card */}
        <section className={`${cardCls} grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.5fr)]`}>
          <div className="min-w-0">
            <div className="flex items-start gap-5">
              {/* Photo with upload */}
              <div className="flex shrink-0 flex-col items-center gap-2">
                <div className="relative h-24 w-24 sm:h-28 sm:w-28">
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt={investor?.name || 'Investor'}
                      className="h-full w-full rounded-full object-cover ring-4 ring-slate-100"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-[#FCD777] to-[#F6B01E] text-3xl font-bold text-slate-900 ring-4 ring-slate-100">
                      {initialLoading ? '' : (investor?.name?.trim()?.[0] || '?').toUpperCase()}
                    </div>
                  )}

                  {photoBusy && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-white/70">
                      <span className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-[#F6B01E]" />
                    </div>
                  )}

                  {!initialLoading && (
                    <>
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        disabled={photoBusy}
                        title={photoUrl ? 'Change photo' : 'Upload photo'}
                        className="no-print absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-[#F6B01E] text-slate-900 shadow-md transition hover:scale-105 hover:bg-[#e9a30f] focus:outline-none focus:ring-2 focus:ring-[#F6B01E]/60 disabled:opacity-60"
                      >
                        <Icon name="camera" className="h-4 w-4" />
                      </button>
                      {photoUrl && (
                        <button
                          type="button"
                          onClick={handlePhotoRemove}
                          disabled={photoBusy}
                          title="Remove photo"
                          className="no-print absolute -bottom-1 -left-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-white text-rose-600 shadow-md transition hover:scale-105 hover:bg-rose-50 focus:outline-none focus:ring-2 focus:ring-rose-300 disabled:opacity-60"
                        >
                          <Icon name="trash" className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </>
                  )}

                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handlePhotoChange}
                    className="hidden"
                  />
                </div>
                {photoError && (
                  <p role="alert" className="no-print max-w-[130px] text-center text-[11px] font-medium text-rose-600">
                    {photoError}
                  </p>
                )}
              </div>

              <div className="min-w-0">
                {initialLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-4 w-44" />
                  </div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h2 className="text-xl font-bold text-slate-900">{investor?.name}</h2>
                      <StatusBadge status={investor?.status} />
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      Investor ID: <span className="font-semibold text-slate-900">{investorCode}</span>
                    </p>
                    <ul className="mt-3 space-y-1.5 text-sm text-slate-600">
                      {phone && (
                        <li className="flex items-center gap-2.5">
                          <Icon name="phone" className="h-3.5 w-3.5 text-slate-500" />
                          {phone}
                        </li>
                      )}
                      {email && (
                        <li className="flex items-center gap-2.5">
                          <Icon name="mail" className="h-3.5 w-3.5 text-slate-500" />
                          {email}
                        </li>
                      )}
                      {investor?.address && (
                        <li className="flex items-start gap-2.5">
                          <Icon name="pin" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" />
                          {investor.address}
                        </li>
                      )}
                    </ul>
                    {typeLabel && (
                      <span className="mt-3 inline-block rounded-full bg-[#E6F0FE] px-3 py-1 text-xs font-medium text-[#2563C9]">
                        {typeLabel}
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>

            {quickActions}
          </div>

          {/* 2 x 2 Stat Tiles */}
          <div className="grid grid-cols-1 gap-3 self-start sm:grid-cols-2">
            <StatTile
              tone="amber"
              icon="wallet"
              label="Total Investment"
              value={initialLoading ? <Skeleton className="h-8 w-28" /> : formatBDT(kpis.totalInvested)}
            />
            <StatTile
              tone="green"
              icon="trending"
              label="Total Return"
              value={initialLoading ? <Skeleton className="h-8 w-28" /> : formatBDT(kpis.profitGenerated)}
              sub={
                initialLoading ? null : (
                  <span className="inline-flex items-center gap-1">
                    <Icon name="arrowUp" className="h-3 w-3" />
                    {kpis.roiPercent || 0}%
                  </span>
                )
              }
              subClass="text-emerald-600"
            />
            <StatTile
              tone="blue"
              icon="building"
              label="Active Projects"
              value={initialLoading ? <Skeleton className="h-8 w-10" /> : breakdown.length}
            />
            <StatTile
              tone="purple"
              icon="calendar"
              label="Last Investment"
              value={
                initialLoading ? (
                  <Skeleton className="h-8 w-28" />
                ) : lastInvestmentDate ? (
                  formatDate(lastInvestmentDate)
                ) : (
                  '—'
                )
              }
            />
          </div>
        </section>

        {/* ======================= REDESIGNED TABS NAV ======================= */}
        <div className="no-print rounded-xl border border-slate-200/90 bg-white p-1.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <nav
            role="tablist"
            aria-label="Investor profile sections"
            className="no-scrollbar flex items-center gap-1 overflow-x-auto rounded-lg bg-slate-50/70 p-1"
          >
            {TABS.map(({ key, label, icon }) => {
              const selected = activeTab === key;
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setActiveTab(key)}
                  className={`group relative inline-flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-semibold transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F6B01E] ${
                    selected
                      ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/80 font-bold'
                      : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900'
                  }`}
                >
                  <Icon
                    name={icon}
                    className={`h-4 w-4 transition-colors ${
                      selected ? 'text-[#F6B01E]' : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                  />
                  <span>{label}</span>
                  {selected && (
                    <span className="absolute inset-x-3 -bottom-1 h-0.5 rounded-full bg-[#F6B01E]" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* ============================ OVERVIEW ============================ */}
        {activeTab === 'overview' && (
          <>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1.3fr)]">
              {/* Personal information */}
              <section className={`${cardCls} p-5`}>
                <CardTitle
                  icon="user"
                  action={
                    <button
                      type="button"
                      onClick={() => navigate(ROUTES.edit(investorId))}
                      className="no-print rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      Edit
                    </button>
                  }
                >
                  Personal Information
                </CardTitle>
                <dl className="divide-y divide-slate-100 text-[13px]">
                  {personalRows.map(([label, value]) => (
                    <div key={label} className="grid grid-cols-[110px_1fr] gap-3 py-2.5">
                      <dt className="text-slate-500">{label}</dt>
                      <dd className="break-words font-medium text-slate-800">
                        {initialLoading ? <Skeleton className="h-4 w-32" /> : value || '—'}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>

              {/* Investment summary */}
              <section className={`${cardCls} p-5`}>
                <CardTitle icon="chart">Investment Summary</CardTitle>
                <div className="grid grid-cols-2 gap-3">
                  <StatTile
                    compact
                    tone="amber"
                    icon="wallet"
                    label="Total Investment"
                    value={initialLoading ? <Skeleton className="h-6 w-20" /> : formatBDT(kpis.totalInvested)}
                    sub={`(${breakdown.length} ${breakdown.length === 1 ? 'Project' : 'Projects'})`}
                  />
                  <StatTile
                    compact
                    tone="green"
                    icon="trending"
                    label="Total Return"
                    value={initialLoading ? <Skeleton className="h-6 w-20" /> : formatBDT(kpis.profitGenerated)}
                    sub={`(${kpis.roiPercent || 0}%)`}
                  />
                  <StatTile
                    compact
                    tone="blue"
                    icon="list"
                    label="Pending Amount"
                    value={
                      initialLoading ? (
                        <Skeleton className="h-6 w-20" />
                      ) : knownDues.length ? (
                        formatBDT(pendingAmount)
                      ) : (
                        '—'
                      )
                    }
                    sub={knownDues.length ? `(${pendingProjects} ${pendingProjects === 1 ? 'Project' : 'Projects'})` : null}
                  />
                  <StatTile
                    compact
                    tone="purple"
                    icon="calendar"
                    label="Next Due"
                    value={initialLoading ? <Skeleton className="h-6 w-20" /> : nextDueRow ? formatDate(nextDueRow.nextDue) : '—'}
                    sub={nextDueRow ? `(${nextDueRow.project})` : null}
                  />
                </div>
              </section>

              {/* Allocation */}
              <section className={`${cardCls} p-5`}>
                <CardTitle icon="pie">Investment Allocation</CardTitle>
                {initialLoading ? (
                  <div className="flex flex-col items-center gap-5">
                    <Skeleton className="h-44 w-44 rounded-full" />
                    <div className="w-full space-y-3">
                      {[0, 1, 2].map((n) => (
                        <Skeleton key={n} className="h-4 w-full" />
                      ))}
                    </div>
                  </div>
                ) : allocation.length === 0 ? (
                  <EmptyNote>No investments recorded yet.</EmptyNote>
                ) : (
                  <div className="flex flex-col items-center gap-5">
                    <Donut
                      segments={allocation}
                      centerTop={formatBDT(allocationTotal)}
                      centerBottom="Total Investment"
                    />
                    <ul className="w-full space-y-3 text-[13px]">
                      {allocation.map((seg) => (
                        <li key={seg.name} className="flex items-center gap-2.5">
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: seg.color }} />
                          <span className="min-w-0 flex-1 truncate text-slate-700">{seg.name}</span>
                          <span className="shrink-0 text-right tabular-nums text-slate-500">{seg.pct}%</span>
                          <span className="shrink-0 whitespace-nowrap text-right font-medium tabular-nums text-slate-800">
                            {formatBDT(seg.amount)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              {/* Recent transactions */}
              <section className={`${cardCls} p-5`}>
                <CardTitle
                  icon="list"
                  action={
                    <button
                      type="button"
                      onClick={() => setActiveTab('history')}
                      className="no-print text-xs font-medium text-[#2563C9] hover:underline"
                    >
                      View All
                    </button>
                  }
                >
                  Recent Investment Transactions
                </CardTitle>
                {initialLoading ? (
                  <div className="space-y-3">
                    {[0, 1, 2, 3].map((n) => (
                      <Skeleton key={n} className="h-6 w-full" />
                    ))}
                  </div>
                ) : (
                  transactionsTable(recentInvestments.slice(0, 5))
                )}
              </section>

              {/* Payment schedule */}
              <section className={`${cardCls} p-5`}>
                <CardTitle icon="calendar">Payment Schedule</CardTitle>
                {initialLoading ? (
                  <div className="space-y-3">
                    {[0, 1, 2, 3].map((n) => (
                      <Skeleton key={n} className="h-6 w-full" />
                    ))}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-[13px]">
                      <thead>
                        <tr className="bg-[#F7F8FB] text-xs text-slate-500">
                          <th className="px-3 py-2.5 font-medium">Project</th>
                          <th className="px-3 py-2.5 font-medium">Total Amount</th>
                          <th className="px-3 py-2.5 font-medium">Paid</th>
                          <th className="px-3 py-2.5 font-medium">Due Amount</th>
                          <th className="px-3 py-2.5 font-medium">Next Due Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {scheduleRows.length === 0 ? (
                          <tr>
                            <td colSpan={5}>
                              <EmptyNote>No payment schedule available.</EmptyNote>
                            </td>
                          </tr>
                        ) : (
                          scheduleRows.map((r) => (
                            <tr key={r.project} className="hover:bg-[#FAFBFD]">
                              <td className="px-3 py-3 font-medium text-slate-800">{r.project}</td>
                              <td className="whitespace-nowrap px-3 py-3 tabular-nums text-slate-700">
                                {r.total === null ? '—' : formatBDT(r.total)}
                              </td>
                              <td className="whitespace-nowrap px-3 py-3 tabular-nums text-slate-700">
                                {r.paid === null ? '—' : formatBDT(r.paid)}
                              </td>
                              <td
                                className={`whitespace-nowrap px-3 py-3 font-medium tabular-nums ${
                                  r.due > 0 ? 'text-rose-600' : 'text-slate-700'
                                }`}
                              >
                                {r.due === null ? '—' : formatBDT(r.due)}
                              </td>
                              <td className="whitespace-nowrap px-3 py-3 text-slate-600">
                                {r.nextDue && (r.due === null || r.due > 0) ? formatDate(r.nextDue) : '—'}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>

            {/* Notes */}
            <section className={`${cardCls} p-5`}>
              <CardTitle
                icon="note"
                action={
                  <button
                    type="button"
                    onClick={() => setActiveTab('notes')}
                    className="no-print text-xs font-medium text-[#2563C9] hover:underline"
                  >
                    All notes
                  </button>
                }
              >
                Notes &amp; Remarks
              </CardTitle>
              {notesBody}
            </section>
          </>
        )}

        {/* ======================= INVESTMENT HISTORY ======================= */}
        {activeTab === 'history' && (
          <section className={`${cardCls} p-5`}>
            <CardTitle icon="list">Investment History</CardTitle>
            {initialLoading ? <Skeleton className="h-40 w-full" /> : transactionsTable(recentInvestments)}
          </section>
        )}

        {/* ============================ PAYMENTS ============================ */}
        {activeTab === 'payments' && (
          <PaymentsTab
            investorId={investorId}
            investorName={investor?.name}
            onChanged={loadSummary}
            autoOpen={payAction}
            onAutoOpenDone={() => setPayAction(null)}
          />
        )}

        {/* ========================== BANK ACCOUNTS ========================= */}
        {activeTab === 'bank' && <BankAccountsTab investorId={investorId} />}

        {/* ============================ DOCUMENTS =========================== */}
        {activeTab === 'documents' && (
          <DocumentsTab investorId={investorId} investments={recentInvestments} />
        )}

        {/* =========================== COMMUNICATION ======================== */}
        {activeTab === 'communication' && <CommunicationTab investorId={investorId} />}

        {/* ============================== NOTES ============================= */}
        {activeTab === 'notes' && <NotesTab investorId={investorId} legacyNotes={investor?.notes} />}

        {/* =========================== ACTIVITY LOG ========================= */}
        {activeTab === 'activity' && <ActivityTab investorId={investorId} />}
      </main>

      {/* New investment drawer */}
      {showInvestmentDrawer && (
        <InvestmentFormDrawer
          variant="profile"
          investorId={investorId}
          investorName={investor?.name}
          onClose={() => setShowInvestmentDrawer(false)}
          onSaved={() => {
            setShowInvestmentDrawer(false);
            loadSummary();
          }}
        />
      )}
    </div>
  );
}