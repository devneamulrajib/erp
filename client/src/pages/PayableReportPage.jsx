import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown, ArrowLeft } from 'lucide-react';
import ModuleNav from '../components/ModuleNav';
import { getContactLedgerSummary } from '../api/accountingReports';
import { getChartOfAccounts } from '../api/chartOfAccounts';
import { getProjects } from '../api/project';

function monthStart() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function PayableReportPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState({ opening: 0, debit: 0, credit: 0, balance: 0 });
  const [loading, setLoading] = useState(true);

  const [from, setFrom] = useState(monthStart());
  const [to, setTo] = useState(todayStr());
  const [contactId, setContactId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [suppliers, setSuppliers] = useState([]);
  const [projects, setProjects] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getContactLedgerSummary({
        contactType: 'Supplier',
        contactId: contactId || undefined,
        project: projectId || undefined,
        from,
        to,
      });
      setRows(data.rows);
      setTotals(data.totals);
    } catch (err) {
      console.error('Failed to load payable report', err);
      setRows([]);
      setTotals({ opening: 0, debit: 0, credit: 0, balance: 0 });
    } finally {
      setLoading(false);
    }
  }, [from, to, contactId, projectId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    getChartOfAccounts({ contactType: 'Supplier' }).then(({ data }) => setSuppliers(data)).catch(() => setSuppliers([]));
    getProjects().then(({ data }) => setProjects(data)).catch(() => setProjects([]));
  }, []);

  function formatMoney(n) {
    return (n || 0).toLocaleString('en-BD', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function exportCsv() {
    const header = ['SL', 'Supplier Name', 'Opening Balance', 'Debit', 'Credit', 'Balance'];
    const lines = rows.map((r, i) => [
      i + 1, r.name, r.openingBalance.toFixed(2), r.debit.toFixed(2), r.credit.toFixed(2), r.balance.toFixed(2),
    ]);
    lines.push(['', 'Total', totals.opening.toFixed(2), totals.debit.toFixed(2), totals.credit.toFixed(2), totals.balance.toFixed(2)]);
    const csv = [header, ...lines].map((row) => row.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payable-report-${from}-to-${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <ModuleNav />

      <div className="px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-gray-500 flex items-center gap-1">
            <Link to="/dashboard" className="text-indigo-600 hover:underline">Home</Link>
            <span>&gt;</span>
            <span className="text-indigo-600 flex items-center gap-0.5">Accounts Module (Report) <ChevronDown size={14} /></span>
            <span>&gt;</span>
            <span className="text-gray-700">Payable Report</span>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="bg-teal-700 hover:bg-teal-800 text-white text-sm font-medium px-4 py-2 rounded-md flex items-center gap-1.5"
          >
            <ArrowLeft size={14} /> Back to Previous
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Select Date</label>
            <div className="flex gap-1">
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="border border-gray-300 rounded-md px-2 py-2 text-sm flex-1" />
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="border border-gray-300 rounded-md px-2 py-2 text-sm flex-1" />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Contractor/Supplier</label>
            <select value={contactId} onChange={(e) => setContactId(e.target.value)} className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full">
              <option value="">Select One Option</option>
              {suppliers.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Project</label>
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="border border-gray-300 rounded-md px-3 py-2 text-sm w-full">
              <option value="">Select Project</option>
              {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </div>
        </div>

        <div className="flex gap-2 mb-3">
          <button onClick={() => window.print()} className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-md">
            PDF
          </button>
          <button onClick={exportCsv} className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-md">
            Excel
          </button>
        </div>

        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-indigo-500 text-white text-left">
              <th className="px-3 py-2 font-medium">SL.</th>
              <th className="px-3 py-2 font-medium">SUPPLIER NAME</th>
              <th className="px-3 py-2 font-medium text-right">OPENING BALANCE</th>
              <th className="px-3 py-2 font-medium text-right">DEBIT</th>
              <th className="px-3 py-2 font-medium text-right">CREDIT</th>
              <th className="px-3 py-2 font-medium text-right">BALANCE</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-6 text-gray-400">Loading...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-6 text-gray-400">No suppliers found</td></tr>
            ) : rows.map((r, i) => (
              <tr key={r._id} className="border-b border-gray-100">
                <td className="px-3 py-2">{i + 1}</td>
                <td className="px-3 py-2 text-indigo-600 font-medium">{r.name}</td>
                <td className="px-3 py-2 text-right">{formatMoney(r.openingBalance)}</td>
                <td className="px-3 py-2 text-right">{formatMoney(r.debit)}</td>
                <td className="px-3 py-2 text-right">{formatMoney(r.credit)}</td>
                <td className="px-3 py-2 text-right">{formatMoney(r.balance)}</td>
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="bg-lime-100 font-semibold border-t-2 border-gray-300">
                <td colSpan={2} className="px-3 py-2 text-center">Total :</td>
                <td className="px-3 py-2 text-right">{formatMoney(totals.opening)}</td>
                <td className="px-3 py-2 text-right">{formatMoney(totals.debit)}</td>
                <td className="px-3 py-2 text-right">{formatMoney(totals.credit)}</td>
                <td className="px-3 py-2 text-right">{formatMoney(totals.balance)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}