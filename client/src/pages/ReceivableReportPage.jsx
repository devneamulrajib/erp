import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send, FileDown, FileSpreadsheet, Users, Wallet, TrendingDown } from 'lucide-react';
import { getContactLedgerSummary } from '../api/accountingReports';
import { getChartOfAccounts } from '../api/chartOfAccounts';
import { getProjects } from '../api/project';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';

// ---- Palette tokens (shared with the Work Order redesign) ----
const C = {
  page: 'bg-[#F6F3EC]',
  surface: 'bg-white',
  border: 'border-[#E4DFCF]',
  ink: 'text-[#1E2A22]',
  inkMuted: 'text-[#6B7268]',
  forest: 'text-[#1F5D42]',
  forestBg: 'bg-[#1F5D42]',
  forestBgHover: 'hover:bg-[#173F2D]',
  forestSoft: 'bg-[#E7F0EA]',
  gold: 'text-[#946B1B]',
  goldSoft: 'bg-[#F7ECD2]',
  danger: 'text-[#A6402A]',
  dangerSoft: 'bg-[#FBEAE3]',
};

function asArray(res) {
  const body = res?.data ?? res;
  if (Array.isArray(body)) return body;
  return body?.rows || body?.data || [];
}

function monthStart() { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10); }
function todayStr() { return new Date().toISOString().slice(0, 10); }

export default function ReceivableReportPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState({ opening: 0, debit: 0, credit: 0, balance: 0 });
  const [loading, setLoading] = useState(true);

  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(todayStr());
  const [contactId, setContactId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [customers, setCustomers] = useState([]);
  const [projects, setProjects] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getContactLedgerSummary({
        contactType: 'Customer',
        contactId: contactId || undefined,
        project: projectId || undefined,
        from,
        to,
      });
      setRows(data.rows || []);
      setTotals(data.totals || { opening: 0, debit: 0, credit: 0, balance: 0 });
    } catch (err) {
      console.error('Failed to load receivable report', err);
      setRows([]);
      setTotals({ opening: 0, debit: 0, credit: 0, balance: 0 });
    } finally {
      setLoading(false);
    }
  }, [from, to, contactId, projectId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    getChartOfAccounts({ contactType: 'Customer' }).then((data) => setCustomers(asArray(data))).catch(() => setCustomers([]));
    getProjects().then((data) => setProjects(asArray(data))).catch(() => setProjects([]));
  }, []);

  function formatMoney(n) {
    return (n || 0).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function exportCsv() {
    const header = ['SL', 'Customer Name', 'Opening Balance', 'Debit', 'Credit', 'Balance'];
    const lines = rows.map((r, i) => [
      i + 1, r.name, r.openingBalance.toFixed(2), r.debit.toFixed(2), r.credit.toFixed(2), r.balance.toFixed(2),
    ]);
    lines.push(['', 'Total', totals.opening.toFixed(2), totals.debit.toFixed(2), totals.credit.toFixed(2), totals.balance.toFixed(2)]);
    const csv = [header, ...lines].map((row) => row.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receivable-report-${from}-to-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleSendSmsToDue() {
    const dueCustomers = rows.filter((r) => r.balance > 0);
    if (!dueCustomers.length) {
      alert('No customers with a due balance in this range.');
      return;
    }
    // NOTE: no SMS gateway wired up yet — same as sendWishSms/sendLeadSms in lead.js.
    alert(`SMS queued for ${dueCustomers.length} due customer(s) (gateway not yet configured).`);
  }

  const dueCount = rows.filter((r) => r.balance > 0).length;

  return (
    <div className={`min-h-screen w-full ${C.page} text-left`}>
      <Topbar />

      <div className="max-w-[1500px] mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <Breadcrumb
              items={[
                { label: 'Home', to: '/dashboard' },
                { label: 'Accounts Module (Report)', to: '/accounts-module/reports' },
                { label: 'Receivable Report' },
              ]}
            />
            <h1 className={`text-3xl font-semibold ${C.ink} mt-1 tracking-tight`}>Receivable Report</h1>
            <p className={`text-sm ${C.inkMuted} mt-1`}>Customer ledger balances for the selected period</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(-1)}
              className={`inline-flex items-center gap-2 bg-white hover:bg-[#FBF9F4] ${C.ink} border ${C.border} text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm transition-colors`}
            >
              <ArrowLeft size={16} /> Back
            </button>
            <button
              onClick={handleSendSmsToDue}
              className={`inline-flex items-center gap-2 ${C.forestBg} ${C.forestBgHover} text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm shadow-[#1F5D42]/20 transition-colors`}
            >
              <Send size={16} /> Send SMS to Due Customers
            </button>
          </div>
        </div>

        {/* Metrics strip */}
        <div className={`grid grid-cols-1 sm:grid-cols-3 rounded-xl overflow-hidden border ${C.border} mb-6`}>
          <Metric icon={Users} label="Customers Listed" value={rows.length.toLocaleString()} accentBorder="border-t-[#1F5D42]" iconColor={C.forest} valueColor={C.ink} />
          <Metric icon={Wallet} label="Total Balance" value={formatMoney(totals.balance)} accentBorder="border-t-[#946B1B]" iconColor={C.gold} valueColor={C.gold} />
          <Metric icon={TrendingDown} label="Customers With Dues" value={dueCount.toLocaleString()} accentBorder="border-t-[#A6402A]" iconColor={C.danger} valueColor={C.ink} />
        </div>

        {/* Workspace */}
        <div className={`${C.surface} rounded-xl border ${C.border} shadow-sm overflow-hidden mb-6`}>
          {/* Filters */}
          <div className={`px-5 py-4 border-b ${C.border} grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4`}>
            <div>
              <label className={`block text-xs font-medium ${C.inkMuted} uppercase tracking-wide mb-1.5`}>From</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className={`w-full border ${C.border} rounded-lg px-3 py-2 text-sm bg-[#FBF9F4] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1F5D42]/25 focus:border-[#1F5D42] transition`}
              />
            </div>
            <div>
              <label className={`block text-xs font-medium ${C.inkMuted} uppercase tracking-wide mb-1.5`}>To</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className={`w-full border ${C.border} rounded-lg px-3 py-2 text-sm bg-[#FBF9F4] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1F5D42]/25 focus:border-[#1F5D42] transition`}
              />
            </div>
            <div>
              <label className={`block text-xs font-medium ${C.inkMuted} uppercase tracking-wide mb-1.5`}>Customer</label>
              <select
                value={contactId}
                onChange={(e) => setContactId(e.target.value)}
                className={`w-full border ${C.border} rounded-lg px-3 py-2 text-sm bg-[#FBF9F4] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1F5D42]/25 focus:border-[#1F5D42] transition`}
              >
                <option value="">All Customers</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className={`block text-xs font-medium ${C.inkMuted} uppercase tracking-wide mb-1.5`}>Project</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className={`w-full border ${C.border} rounded-lg px-3 py-2 text-sm bg-[#FBF9F4] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#1F5D42]/25 focus:border-[#1F5D42] transition`}
              >
                <option value="">All Projects</option>
                {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>

          {/* Export actions */}
          <div className={`px-5 py-3 border-b ${C.border} flex items-center gap-2 bg-[#FBF9F4]`}>
            <button
              onClick={() => window.print()}
              className={`inline-flex items-center gap-1.5 bg-white hover:bg-[#F6F3EC] ${C.danger} border border-[#EFC9BB] text-xs font-medium px-3 py-1.5 rounded-lg transition-colors`}
            >
              <FileDown size={13} /> PDF
            </button>
            <button
              onClick={exportCsv}
              className={`inline-flex items-center gap-1.5 bg-white hover:bg-[#F6F3EC] ${C.forest} border border-[#BFD9CB] text-xs font-medium px-3 py-1.5 rounded-lg transition-colors`}
            >
              <FileSpreadsheet size={13} /> Excel
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className={`${C.forestBg} text-white whitespace-nowrap`}>
                  <th className="px-4 py-3 text-left font-medium text-[11px] uppercase tracking-wide">SL</th>
                  <th className="px-4 py-3 text-left font-medium text-[11px] uppercase tracking-wide">Customer Name</th>
                  <th className="px-4 py-3 text-right font-medium text-[11px] uppercase tracking-wide">Opening Balance</th>
                  <th className="px-4 py-3 text-right font-medium text-[11px] uppercase tracking-wide">Debit</th>
                  <th className="px-4 py-3 text-right font-medium text-[11px] uppercase tracking-wide">Credit</th>
                  <th className="px-4 py-3 text-right font-medium text-[11px] uppercase tracking-wide">Balance</th>
                  <th className="px-4 py-3 text-left font-medium text-[11px] uppercase tracking-wide">Action</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${C.border}`}>
                {loading ? (
                  <tr><td colSpan={7} className={`text-center py-14 ${C.inkMuted} text-sm`}>Loading report…</td></tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-14">
                      <Users size={28} className="mx-auto text-[#C7C1AE] mb-2" />
                      <p className={`${C.ink} text-sm font-medium`}>No customers found</p>
                      <p className={`${C.inkMuted} text-xs mt-0.5`}>Try adjusting your filters or date range</p>
                    </td>
                  </tr>
                ) : (
                  rows.map((r, i) => (
                    <tr
                      key={r.id}
                      className={`whitespace-nowrap transition-colors hover:bg-[#F6F3EC] ${i % 2 === 1 ? 'bg-[#FBF9F4]' : 'bg-white'}`}
                    >
                      <td className="px-4 py-3 text-[#9AA098]">{i + 1}</td>
                      <td className={`px-4 py-3 ${C.forest} font-medium`}>{r.name}</td>
                      <td className={`px-4 py-3 text-right ${C.ink} tabular-nums`}>{formatMoney(r.openingBalance)}</td>
                      <td className={`px-4 py-3 text-right ${C.ink} tabular-nums`}>{formatMoney(r.debit)}</td>
                      <td className={`px-4 py-3 text-right ${C.ink} tabular-nums`}>{formatMoney(r.credit)}</td>
                      <td className={`px-4 py-3 text-right font-semibold tabular-nums ${r.balance > 0 ? C.danger : C.gold}`}>{formatMoney(r.balance)}</td>
                      <td className="px-4 py-3"></td>
                    </tr>
                  ))
                )}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr className={`border-t-2 border-[#1F5D42] font-semibold ${C.goldSoft}`}>
                    <td colSpan={2} className={`px-4 py-3 text-center ${C.ink}`}>Total</td>
                    <td className={`px-4 py-3 text-right ${C.ink} tabular-nums`}>{formatMoney(totals.opening)}</td>
                    <td className={`px-4 py-3 text-right ${C.ink} tabular-nums`}>{formatMoney(totals.debit)}</td>
                    <td className={`px-4 py-3 text-right ${C.ink} tabular-nums`}>{formatMoney(totals.credit)}</td>
                    <td className={`px-4 py-3 text-right ${C.gold} tabular-nums`}>{formatMoney(totals.balance)}</td>
                    <td className="px-4 py-3"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value, accentBorder, iconColor, valueColor }) {
  return (
    <div className={`bg-white border-t-[3px] ${accentBorder} px-5 py-4 flex items-center gap-3.5 border-r border-[#E4DFCF] last:border-r-0`}>
      <div className="w-9 h-9 rounded-lg bg-[#E7F0EA] flex items-center justify-center shrink-0">
        <Icon size={16} className={iconColor} />
      </div>
      <div>
        <p className={`text-[11px] font-medium ${C.inkMuted} uppercase tracking-wide`}>{label}</p>
        <p className={`text-xl font-semibold tabular-nums ${valueColor}`}>{value}</p>
      </div>
    </div>
  );
}