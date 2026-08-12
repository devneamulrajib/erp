import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getParties } from '../api/party';
import { getChartOfAccounts } from '../api/chartOfAccounts';
import { getLabourBills, deleteLabourBill } from '../api/labourBill';
import Topbar from '../components/Topbar';
import ModuleNav from '../components/ModuleNav';
import Breadcrumb from '../components/Breadcrumb';
import { ChevronDown, PlusCircle } from 'lucide-react';

function num(v) { return Number(v) || 0; }

export default function LabourWorkerBillList() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [parties, setParties] = useState([]);
  const [ledgers, setLedgers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openActionId, setOpenActionId] = useState(null);

  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [filterParty, setFilterParty] = useState('');
  const [filterLedger, setFilterLedger] = useState('');
  const [search, setSearch] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getLabourBills({ from, to, party: filterParty, ledger: filterLedger });
      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.response?.data?.message || e.message || 'Failed to load labour/worker bills');
    } finally {
      setLoading(false);
    }
  }, [from, to, filterParty, filterLedger]);

  useEffect(() => { loadRows(); }, [loadRows]);

  useEffect(() => {
    getParties().then(setParties).catch(() => {});
    getChartOfAccounts().then((res) => setLedgers(res.data || res)).catch(() => {});
  }, []);

  async function handleDelete(row) {
    if (!window.confirm('Delete this labour/worker bill?')) return;
    try {
      await deleteLabourBill(row._id);
      setRows((prev) => prev.filter((r) => r._id !== row._id));
    } catch (e) {
      alert(e.response?.data?.message || e.message || 'Failed to delete');
    }
    setOpenActionId(null);
  }

  const filtered = rows.filter((r) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return [r.code, r.titleOfWork, r.party?.name, r.project?.name]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q));
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totals = filtered.reduce((acc, r) => ({
    grandTotal: acc.grandTotal + num(r.totalPayable),
    paid: acc.paid + num(r.paid),
    due: acc.due + num(r.due),
  }), { grandTotal: 0, paid: 0, due: 0 });

  return (
    <div className="min-h-screen w-full bg-gray-50 text-left">
      <Topbar />
      <ModuleNav />

      <div className="flex items-center justify-between pr-4">
        <Breadcrumb
          items={[
            { label: 'Home', to: '/dashboard' },
            { label: 'Labour/Worker', to: '/service/labor-worker-bill-list' },
            { label: 'Labour/Worker Bill List' },
          ]}
        />
        <button
          onClick={() => navigate('/service/labor-worker-bill-add')}
          className="flex items-center gap-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium px-4 py-2 rounded-md"
        >
          <PlusCircle size={15} /> New Labour/Worker Bill
        </button>
      </div>

      <div className="px-4 pb-6">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 mb-4">{error}</div>}

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-2">
          <div>
            <label className="block text-sm text-gray-600 mb-1">From</label>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">To</label>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Contractor/Supplier/Worker</label>
            <select value={filterParty} onChange={(e) => setFilterParty(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
              <option value="">Select One Option</option>
              {parties.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Ledger</label>
            <select value={filterLedger} onChange={(e) => setFilterLedger(e.target.value)} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
              <option value="">Select Chart Of Account</option>
              {ledgers.map((l) => <option key={l._id} value={l._id}>{l.code ? `${l.code}-${l.name}` : l.name}</option>)}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">Show</span>
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="border border-gray-300 rounded-md px-2 py-1.5 text-sm">
              {[10, 25, 50].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <span className="text-gray-500">entries</span>
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
                {['ID', 'Project Type', 'Project', 'Title/Name of Work', 'Worker/Contractor/Supplier', 'DR Ledger',
                  'Credit Ledger', 'Code', 'Date', 'Grand Total', 'Paid', 'Due', 'Added By', 'Approve', 'Attachment', 'Action'].map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={16} className="text-center py-8 text-gray-400">Loading…</td></tr>
              ) : paged.length === 0 ? (
                <tr><td colSpan={16} className="text-center py-8 text-gray-400">No data available in table</td></tr>
              ) : (
                paged.map((row, i) => (
                  <tr key={row._id} className="border-t border-gray-100 whitespace-nowrap align-top">
                    <td className="px-3 py-2">{(page - 1) * pageSize + i + 1}</td>
                    <td className="px-3 py-2">{row.projectType || '-'}</td>
                    <td className="px-3 py-2">{row.project?.name || '-'}</td>
                    <td className="px-3 py-2">{row.titleOfWork || '-'}</td>
                    <td className="px-3 py-2">{row.party?.name || '-'}</td>
                    <td className="px-3 py-2 text-indigo-600">{row.ledger?.name || '-'}</td>
                    <td className="px-3 py-2">{row.creditLedgerLabel || 'TBA'}</td>
                    <td className="px-3 py-2">{row.code}</td>
                    <td className="px-3 py-2">{row.date}</td>
                    <td className="px-3 py-2 font-medium">{num(row.totalPayable).toLocaleString()}</td>
                    <td className="px-3 py-2">{num(row.paid).toLocaleString()}</td>
                    <td className="px-3 py-2">{num(row.due).toLocaleString()}</td>
                    <td className="px-3 py-2">{row.addedBy || '-'}</td>
                    <td className="px-3 py-2">
                      {(row.approvals || []).map((a, idx) => (
                        <div key={idx} className={`text-xs ${a.approved ? 'text-emerald-600' : 'text-red-500'}`}>
                          {a.approved ? '✓' : '✗'} {a.name}
                        </div>
                      ))}
                    </td>
                    <td className="px-3 py-2">
                      {row.attachment ? <a href={row.attachment} target="_blank" rel="noreferrer" className="text-indigo-600 underline">File</a> : '-'}
                    </td>
                    <td className="px-3 py-2 relative">
                      <button
                        onClick={() => setOpenActionId(openActionId === row._id ? null : row._id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded text-xs"
                      >
                        <span className="sr-only">Actions</span>
                        <ChevronDown size={12} />
                      </button>
                      {openActionId === row._id && (
                        <div className="absolute right-3 mt-1 w-32 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                          <button onClick={() => { navigate(`/service/labor-worker-bill-add/${row._id}`); setOpenActionId(null); }} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50">Edit</button>
                          <button onClick={() => { navigate(`/service/labor-worker-bill-add/${row._id}`); setOpenActionId(null); }} className="w-full text-left px-3 py-2 text-xs hover:bg-gray-50">View</button>
                          <button onClick={() => handleDelete(row)} className="w-full text-left px-3 py-2 text-xs text-red-600 hover:bg-red-50">Delete</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr className="border-t border-gray-200 font-medium">
                  <td colSpan={9} className="px-3 py-2 text-right">TOTAL:</td>
                  <td className="px-3 py-2">{totals.grandTotal.toLocaleString()}</td>
                  <td className="px-3 py-2">{totals.paid.toLocaleString()}</td>
                  <td className="px-3 py-2">{totals.due.toLocaleString()}</td>
                  <td colSpan={4}></td>
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