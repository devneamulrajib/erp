import { useState, useEffect, useCallback, useMemo } from 'react';
import Topbar from '../components/Topbar';
import Breadcrumb from '../components/Breadcrumb';
import { getChartOfGroupHierarchy } from '../api/chartOfGroup';
import { FileDown, FileSpreadsheet, Network, ChevronRight, Tag, LayoutGrid } from 'lucide-react';

function flattenForExport(nodes, depth = 0, rows = []) {
  nodes.forEach((node) => {
    rows.push({ label: node.name, code: node.code, depth, isGroup: true });
    (node.accounts || []).forEach((acc) => {
      rows.push({ label: acc.name, code: acc.code, depth: depth + 1, isGroup: false });
    });
    if (node.children?.length) flattenForExport(node.children, depth + 1, rows);
  });
  return rows;
}

function countNodes(nodes) {
  let groups = 0;
  let accounts = 0;
  nodes.forEach((node) => {
    groups += 1;
    accounts += (node.accounts || []).length;
    if (node.children?.length) {
      const child = countNodes(node.children);
      groups += child.groups;
      accounts += child.accounts;
    }
  });
  return { groups, accounts };
}

function TreeRows({ nodes, depth = 0 }) {
  return nodes.map((node) => (
    <div key={node.id}>
      <div
        className="flex items-center justify-between px-5 py-3 text-sm font-semibold text-slate-800 bg-slate-50/80 border-b border-slate-100 whitespace-nowrap"
        style={{ paddingLeft: `${20 + depth * 24}px` }}
      >
        <span className="flex items-center gap-2">
          {depth > 0 && <ChevronRight size={14} className="text-slate-300" />}
          <Network size={14} className="text-indigo-500" />
          {node.name}
        </span>
        <span className="inline-flex items-center rounded-full bg-indigo-50 text-indigo-600 px-2.5 py-1 text-xs font-mono font-medium ring-1 ring-inset ring-indigo-600/10">
          {node.code}
        </span>
      </div>
      {(node.accounts || []).map((acc) => (
        <div
          key={acc.id}
          className="flex items-center justify-between px-5 py-3 text-sm text-slate-600 border-b border-slate-100 hover:bg-slate-50/70 transition-colors whitespace-nowrap"
          style={{ paddingLeft: `${20 + (depth + 1) * 24}px` }}
        >
          <span className="flex items-center gap-2">
            <ChevronRight size={14} className="text-slate-300" />
            <Tag size={13} className="text-slate-400" />
            {acc.name}
          </span>
          <span className="text-slate-400 font-mono text-xs">{acc.code}</span>
        </div>
      ))}
      {node.children?.length > 0 && <TreeRows nodes={node.children} depth={depth + 1} />}
    </div>
  ));
}

export default function ChartOfGroupHierarchy() {
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await getChartOfGroupHierarchy();
      setTree(data);
    } catch (err) {
      console.error('Failed to load hierarchy', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const { groups, accounts } = useMemo(() => countNodes(tree), [tree]);

  function exportCsv() {
    const rows = flattenForExport(tree);
    const csv = [
      'Name,Code',
      ...rows.map((r) => `"${'  '.repeat(r.depth)}${r.label.replace(/"/g, '""')}",${r.code}`),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'chart-of-group-hierarchy.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 text-left">
      <Topbar />

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6 print:hidden">
          <div>
            <Breadcrumb
              items={[
                { label: 'Home', to: '/dashboard' },
                { label: 'Accounts Module', to: '/accounts-module/chart-of-accounts' },
                { label: 'Chart Of Group Hierarchy' },
              ]}
            />
            <h1 className="text-2xl font-semibold text-slate-900 mt-1 tracking-tight">Chart of Group Hierarchy</h1>
            <p className="text-sm text-slate-500 mt-0.5">Visualize how your account groups and charts of accounts are nested</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm shadow-red-500/20 transition-colors"
            >
              <FileDown size={16} strokeWidth={2.5} />
              PDF
            </button>
            <button
              onClick={exportCsv}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg shadow-sm shadow-emerald-600/20 transition-colors"
            >
              <FileSpreadsheet size={16} strokeWidth={2.5} />
              Excel
            </button>
          </div>
        </div>

        {/* Summary strip */}
        <div className="grid grid-cols-2 gap-3 mb-6 print:hidden">
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Total Groups</div>
            <div className="text-xl font-semibold text-slate-900">{groups}</div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">Total Accounts</div>
            <div className="text-xl font-semibold text-slate-900">{accounts}</div>
          </div>
        </div>

        {/* Tree panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="text-center py-16 text-slate-400 text-sm">Loading...</div>
            ) : tree.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-16 text-slate-400">
                <LayoutGrid size={28} strokeWidth={1.5} />
                <p className="text-sm">No hierarchy data found.</p>
              </div>
            ) : (
              <TreeRows nodes={tree} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}