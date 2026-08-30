import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { getFundRequisitions } from '../api/fundRequisition';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

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

  function copyToClipboard() {
    const header = ['SL', 'Date', 'From', 'To', 'Amount', 'Approved Amount', 'Purpose', 'Reference'].join('\t');
    const lines = filtered.map((r, i) => [
      i + 1, r.date, r.from?.name || 'TBA', '', num(r.amount), num(r.approvedAmount), r.purpose || '', r.reference || '',
    ].join('\t'));
    navigator.clipboard.writeText([header, ...lines].join('\n')).catch(() => {});
  }

  return (
    <div>

      <div className="px-6 py-4">
        <div className="text-sm text-gray-500 flex items-center gap-1 mb-4">
          <Link to="/dashboard" className="text-indigo-600 hover:underline">Home</Link>
          <span>&gt;</span>
          <span className="text-indigo-600 flex items-center gap-0.5">Requisition <ChevronDown size={14} /></span>
          <span>&gt;</span>
          <span className="text-gray-700">Fund Requisition Report</span>
        </div>

        <div className="mb-4">
          <label className="block text-sm text-gray-600 mb-1">Select Date</label>
          <div className="flex gap-1 max-w-md">
            <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} className="border border-gray-300 rounded-md px-2 py-2 text-sm flex-1" />
            <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} className="border border-gray-300 rounded-md px-2 py-2 text-sm flex-1" />
          </div>
        </div>

        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="flex gap-2">
            <button onClick={copyToClipboard} className="bg-sky-500 hover:bg-sky-600 text-white text-sm font-medium px-4 py-1.5 rounded-md">Copy</button>
            <button onClick={exportCsv} className="bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-1.5 rounded-md">CSV</button>
            <button onClick={exportCsv} className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-medium px-4 py-1.5 rounded-md">Excel</button>
            <button onClick={() => window.print()} className="bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-4 py-1.5 rounded-md">PDF</button>
            <span className="text-gray-500 text-sm self-center ml-2">Show</span>
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="border border-gray-300 rounded-md px-2 py-1.5 text-sm">
              {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <span className="text-gray-500 text-sm self-center">entries</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">Search:</span>
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="border border-gray-300 rounded-md px-3 py-1.5 text-sm w-56" />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-indigo-500 text-white whitespace-nowrap text-left">
                <th className="px-3 py-2 font-medium">SL</th>
                <th className="px-3 py-2 font-medium">DATE</th>
                <th className="px-3 py-2 font-medium">FROM</th>
                <th className="px-3 py-2 font-medium">TO</th>
                <th className="px-3 py-2 font-medium text-right">AMOUNT</th>
                <th className="px-3 py-2 font-medium text-right">APPROVED AMOUNT</th>
                <th className="px-3 py-2 font-medium">PURPOSE</th>
                <th className="px-3 py-2 font-medium">REFERENCE</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-8 text-gray-400">Loading…</td></tr>
              ) : pageRows.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-8 text-gray-400">No data available in table</td></tr>
              ) : pageRows.map((row, i) => (
                <tr key={row._id} className="border-t border-gray-100 whitespace-nowrap">
                  <td className="px-3 py-2">{(page - 1) * pageSize + i + 1}</td>
                  <td className="px-3 py-2">{row.date}</td>
                  <td className="px-3 py-2">{row.from?.name || 'TBA'}</td>
                  <td className="px-3 py-2"></td>
                  <td className="px-3 py-2 text-right">{num(row.amount).toLocaleString()}</td>
                  <td className="px-3 py-2 text-right">{row.approvedAmount ? num(row.approvedAmount).toLocaleString() : ''}</td>
                  <td className="px-3 py-2">{row.purpose || '-'}</td>
                  <td className="px-3 py-2">{row.reference || '-'}</td>
                </tr>
              ))}
            </tbody>
            {pageRows.length > 0 && (
              <tfoot>
                <tr className="font-semibold border-t border-gray-200">
                  <td colSpan={4} className="px-3 py-2">TOTAL</td>
                  <td className="px-3 py-2 text-right">{totals.amount.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right">{totals.approvedAmount.toLocaleString()}</td>
                  <td colSpan={2}></td>
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