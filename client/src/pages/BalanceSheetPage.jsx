import { useState, useEffect, useCallback } from 'react';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import { getBalanceSheet } from '../api/accountingReports';
import { Landmark, FileSpreadsheet, CheckCircle2, XCircle, ChevronDown, ChevronRight } from 'lucide-react';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

const ASSET_HINT = /asset|cash|bank|receivable|inventory|stock|fixed/i;
const LIABILITY_HINT = /liabilit|payable|loan|due/i;
const EQUITY_HINT = /equity|capital|owner|retained/i;

export default function BalanceSheetPage() {
  const [asOf, setAsOf] = useState(todayStr());
  const [sections, setSections] = useState([]);
  const [classification, setClassification] = useState({});
  const [expanded, setExpanded] = useState({});
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getBalanceSheet({ asOf });
      const secs = Array.isArray(data.sections) ? data.sections : [];
      setSections(secs);
      setClassification((prev) => {
        const next = { ...prev };
        secs.forEach((s) => {
          if (next[s.section] !== undefined) return;
          if (ASSET_HINT.test(s.section)) next[s.section] = 'asset';
          else if (LIABILITY_HINT.test(s.section)) next[s.section] = 'liability';
          else if (EQUITY_HINT.test(s.section)) next[s.section] = 'equity';
          else next[s.section] = 'ignore';
        });
        return next;
      });
    } catch (err) {
      console.error('Failed to load balance sheet', err);
      setSections([]);
    } finally {
      setLoading(false);
    }
  }, [asOf]);

  useEffect(() => { load(); }, [load]);

  function setSectionClass(section, value) {
    setClassification((prev) => ({ ...prev, [section]: value }));
  }
  function toggleExpand(section) {
    setExpanded((prev) => ({ ...prev, [section]: !prev[section] }));
  }

  function formatMoney(n) {
    return (n || 0).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  const assetSections = sections.filter((s) => classification[s.section] === 'asset');
  const liabilitySections = sections.filter((s) => classification[s.section] === 'liability');
  const equitySections = sections.filter((s) => classification[s.section] === 'equity');
  const ignoredSections = sections.filter((s) => classification[s.section] === 'ignore');

  const totalAssets = assetSections.reduce((sum, s) => sum + s.netBalance, 0);
  const totalLiabilities = liabilitySections.reduce((sum, s) => sum + s.netBalance, 0);
  const totalEquity = equitySections.reduce((sum, s) => sum + s.netBalance, 0);
  const balanced = Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01;

  function exportExcel() {
    const rows = [
      ['Section', 'Type', 'Amount'],
      ...assetSections.map((s) => [s.section, 'Asset', s.netBalance]),
      ['Total Assets', '', totalAssets],
      ['', '', ''],
      ...liabilitySections.map((s) => [s.section, 'Liability', s.netBalance]),
      ['Total Liabilities', '', totalLiabilities],
      ['', '', ''],
      ...equitySections.map((s) => [s.section, 'Equity', s.netBalance]),
      ['Total Equity', '', totalEquity],
      ['', '', ''],
      ['Total Liabilities + Equity', '', totalLiabilities + totalEquity],
    ];
    const csv = rows.map((r) => r.map((c) => `"${c ?? ''}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'balance_sheet.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function SectionGroup({ items, colorClass }) {
    return items.map((s) => (
      <div key={s.section} className="border-b border-slate-100 last:border-b-0">
        <button
          onClick={() => toggleExpand(s.section)}
          className="w-full flex items-center justify-between py-2 hover:bg-slate-50/70 transition-colors px-1"
        >
          <span className="flex items-center gap-1.5 text-slate-700">
            {expanded[s.section] ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
            {s.section}
          </span>
          <span className={`font-mono ${colorClass}`}>{formatMoney(s.netBalance)}</span>
        </button>
        {expanded[s.section] && (
          <div className="pl-6 pb-2">
            {s.accounts.map((a) => (
              <div key={a.id} className="flex items-center justify-between py-1 text-xs text-slate-500">
                <span>{a.name}</span>
                <span className="font-mono">{formatMoney(a.balance)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    ));
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 text-left">
      <Topbar />

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-6">
        <div className="mb-6">
          <Breadcrumb
            items={[
              { label: 'Home', to: '/dashboard' },
              { label: 'Accounts Module (Report)', to: '/dashboard' },
              { label: 'Balance Sheet' },
            ]}
          />
          <h1 className="text-2xl font-semibold text-slate-900 mt-1 tracking-tight">Balance Sheet</h1>
          <p className="text-sm text-slate-500 mt-0.5">Assets, Liabilities, and Equity as of a chosen date, by Chart of Group section</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-5 py-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">As Of</label>
              <input
                type="date"
                value={asOf}
                onChange={(e) => setAsOf(e.target.value)}
                className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-full bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
              />
            </div>
            <div className="sm:col-span-2 flex justify-end">
              <button
                onClick={() => load()}
                className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-sm font-medium px-5 py-2.5 rounded-lg shadow-sm shadow-indigo-600/20 transition-colors"
              >
                <Landmark size={15} strokeWidth={2.5} />
                Report
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm py-16 text-center text-slate-400 text-sm">Loading…</div>
        ) : sections.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm py-16 text-center text-slate-400 text-sm">
            No account activity as of this date.
          </div>
        ) : (
          <>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 mb-6">
              <h2 className="text-sm font-semibold text-slate-700 mb-3">Classify sections</h2>
              <p className="text-xs text-slate-500 mb-4">
                Section names come from your Chart of Group's top-level names. Mark each as Asset, Liability, Equity, or ignore.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {sections.map((s) => (
                  <div key={s.section} className="flex items-center justify-between border border-slate-100 rounded-lg px-3 py-2">
                    <span className="text-sm text-slate-700">{s.section}</span>
                    <select
                      value={classification[s.section] || 'ignore'}
                      onChange={(e) => setSectionClass(s.section, e.target.value)}
                      className="border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white"
                    >
                      <option value="asset">Asset</option>
                      <option value="liability">Liability</option>
                      <option value="equity">Equity</option>
                      <option value="ignore">Ignore</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
                <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Total Assets</div>
                <div className="text-lg font-semibold text-emerald-700 font-mono">{formatMoney(totalAssets)}</div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
                <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Total Liabilities</div>
                <div className="text-lg font-semibold text-red-700 font-mono">{formatMoney(totalLiabilities)}</div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
                <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Total Equity</div>
                <div className="text-lg font-semibold text-indigo-700 font-mono">{formatMoney(totalEquity)}</div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
                <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Liabilities + Equity</div>
                <div className="text-lg font-semibold text-slate-800 font-mono">{formatMoney(totalLiabilities + totalEquity)}</div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                <div className={`inline-flex items-center gap-2 text-sm font-medium ${balanced ? 'text-emerald-700' : 'text-red-700'}`}>
                  {balanced ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                  {balanced ? 'Balanced (Assets = Liabilities + Equity)' : `Out of balance by ${formatMoney(Math.abs(totalAssets - (totalLiabilities + totalEquity)))}`}
                </div>
                <button
                  onClick={exportExcel}
                  className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  <FileSpreadsheet size={14} /> Excel
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5">
                <div>
                  <h3 className="text-sm font-semibold text-emerald-700 mb-2">Assets</h3>
                  <div className="border border-slate-100 rounded-lg divide-y divide-slate-100">
                    {assetSections.length === 0 ? (
                      <p className="text-xs text-slate-400 py-3 px-2">No sections marked as Asset</p>
                    ) : (
                      <SectionGroup items={assetSections} colorClass="text-emerald-700" />
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-2 px-1 font-semibold text-sm">
                    <span>Total Assets</span>
                    <span className="font-mono text-emerald-700">{formatMoney(totalAssets)}</span>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-red-700 mb-2">Liabilities</h3>
                  <div className="border border-slate-100 rounded-lg divide-y divide-slate-100 mb-4">
                    {liabilitySections.length === 0 ? (
                      <p className="text-xs text-slate-400 py-3 px-2">No sections marked as Liability</p>
                    ) : (
                      <SectionGroup items={liabilitySections} colorClass="text-red-700" />
                    )}
                  </div>

                  <h3 className="text-sm font-semibold text-indigo-700 mb-2">Equity</h3>
                  <div className="border border-slate-100 rounded-lg divide-y divide-slate-100">
                    {equitySections.length === 0 ? (
                      <p className="text-xs text-slate-400 py-3 px-2">No sections marked as Equity</p>
                    ) : (
                      <SectionGroup items={equitySections} colorClass="text-indigo-700" />
                    )}
                  </div>
                  <div className="flex items-center justify-between mt-2 px-1 font-semibold text-sm">
                    <span>Total Liabilities + Equity</span>
                    <span className="font-mono text-slate-800">{formatMoney(totalLiabilities + totalEquity)}</span>
                  </div>
                </div>
              </div>

              {ignoredSections.length > 0 && (
                <p className="text-xs text-slate-400 px-5 pb-4">
                  Ignored: {ignoredSections.map((s) => s.section).join(', ')}
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}