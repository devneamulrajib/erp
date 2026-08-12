import { useEffect, useState, useCallback } from 'react';
import api from '../api/axios';
import { getParties } from '../api/party';
import { getContractorBillReport } from '../api/contractorBillReport';
import Topbar from '../components/Topbar';
import ModuleNav from '../components/ModuleNav';
import Breadcrumb from '../components/Breadcrumb';

function num(v) { return Number(v) || 0; }

export default function ContractorBillReportPage() {
  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState({ gross: 0, securityDeposit: 0, paid: 0, due: 0 });
  const [projects, setProjects] = useState([]);
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [filterParty, setFilterParty] = useState('');
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getContractorBillReport({ from, to, project: filterProject, party: filterParty });
      setRows(data.rows || []);
      setTotals(data.totals || { gross: 0, securityDeposit: 0, paid: 0, due: 0 });
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [from, to, filterProject, filterParty]);

  useEffect(() => { loadRows(); }, [loadRows]);

  useEffect(() => {
    api.get('/projects').then((res) => setProjects(res.data)).catch(() => {});
    getParties().then(setParties).catch(() => {});
  }, []);

  const filtered = rows.filter((r) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return [r.invoiceNo, r.contractor, r.labourWorker, r.particulars]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="min-h-screen w-full bg-gray-50 text-left">
      <Topbar />
      <ModuleNav />

      <Breadcrumb
        items={[
          { label: 'Home', to: '/dashboard' },
          { label: 'Billing', to: '/billing/contractor_bill_report' },
          { label: 'Contractor Bill Report' },
        ]}
      />

      <div className="px-4 pb-6">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-4 mt-4">{error}</div>}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4 mt-4">
          <div className="sm:col-span-1 grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm text-gray-600 mb-1">From</label>
              <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">To</label>
              <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Project</label>
            <select value={filterProject} onChange={(e) => { setFilterProject(e.target.value); setPage(1); }} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
              <option value="">Select value</option>
              {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Contractor</label>
            <select value={filterParty} onChange={(e) => { setFilterParty(e.target.value); setPage(1); }} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
              <option value="">Select One Option</option>
              {parties.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium px-4 py-1.5 rounded-md">Excel</button>
            <button className="bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-4 py-1.5 rounded-md" onClick={() => window.print()}>PDF</button>
            <span className="text-gray-500 text-sm">Show</span>
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="border border-gray-300 rounded-md px-2 py-1.5 text-sm">
              {[10, 25, 50].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <span className="text-gray-500 text-sm">entries</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">Search:</span>
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-56" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-indigo-500 text-white whitespace-nowrap">
                {['SL', 'Invoice No.', 'Contractor', 'Labour/Worker', 'Particulars', 'Qty/Days',
                  'Rate', 'Gross', 'Security Deposit', 'Paid', 'Due'].map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={11} className="text-center py-8 text-gray-400">Loading…</td></tr>
              ) : paged.length === 0 ? (
                <tr><td colSpan={11} className="text-center py-8 text-gray-400">No data available in table</td></tr>
              ) : (
                paged.map((row, i) => (
                  <tr key={i} className="border-t border-gray-100 whitespace-nowrap align-top">
                    <td className="px-3 py-2">{(page - 1) * pageSize + i + 1}</td>
                    <td className="px-3 py-2">{row.invoiceNo}</td>
                    <td className="px-3 py-2">{row.contractor || '-'}</td>
                    <td className="px-3 py-2">{row.labourWorker || '-'}</td>
                    <td className="px-3 py-2">{row.particulars || '-'}</td>
                    <td className="px-3 py-2">{num(row.qtyDays).toLocaleString()} {row.unit}</td>
                    <td className="px-3 py-2">{num(row.rate).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="px-3 py-2 font-medium">{num(row.gross).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="px-3 py-2">{num(row.securityDeposit).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="px-3 py-2">{num(row.paid).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    <td className="px-3 py-2">{num(row.due).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  </tr>
                ))
              )}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr className="border-t border-gray-200 font-medium">
                  <td colSpan={7} className="px-3 py-2 text-right">GRAND TOTAL</td>
                  <td className="px-3 py-2">{totals.gross.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="px-3 py-2">{totals.securityDeposit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="px-3 py-2">{totals.paid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="px-3 py-2">{totals.due.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        <div className="flex items-center justify-between mt-3">
          <span className="text-sm text-gray-500">
            Showing {filtered.length === 0 ? 0 : (page - 1) * pageSize + 1} to {Math.min(page * pageSize, filtered.length)} of {filtered.length} entries
          </span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-1.5 rounded-md text-sm bg-gray-100 text-gray-500 disabled:opacity-50">Previous</button>
            <span className="px-3 py-1.5 rounded-md text-sm bg-indigo-500 text-white">{page}</span>
            <button disabled={page === totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="px-3 py-1.5 rounded-md text-sm bg-gray-100 text-gray-500 disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
}