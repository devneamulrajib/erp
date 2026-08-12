import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getChartOfGroupHierarchy } from '../api/chartOfGroup';

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

function TreeRows({ nodes, depth = 0 }) {
  return nodes.map((node) => (
    <div key={node._id}>
      <div
        className="flex justify-between border-b border-gray-100 px-3 py-1.5 text-sm font-semibold bg-gray-50"
        style={{ paddingLeft: `${12 + depth * 20}px` }}
      >
        <span>{node.name}</span>
        <span className="text-gray-500">{node.code}</span>
      </div>
      {(node.accounts || []).map((acc) => (
        <div
          key={acc._id}
          className="flex justify-between border-b border-gray-100 px-3 py-1.5 text-sm"
          style={{ paddingLeft: `${12 + (depth + 1) * 20}px` }}
        >
          <span>{acc.name}</span>
          <span className="text-gray-500">{acc.code}</span>
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
    <div>
      <div className="px-6 py-4 print:px-0">
        <div className="flex items-center justify-between mb-4 print:hidden">
          <div className="text-sm text-gray-500 flex items-center gap-1">
            <Link to="/dashboard" className="text-indigo-600 hover:underline">Home</Link>
            <span>&gt;</span>
            <span className="text-indigo-600">Accounts Module</span>
            <span>&gt;</span>
            <span className="text-gray-700">Chart Of Group Hierarchy</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
              className="bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-4 py-2 rounded-md"
            >
              PDF
            </button>
            <button
              onClick={exportCsv}
              className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-md"
            >
              Excel
            </button>
          </div>
        </div>

        <div className="border border-gray-200 rounded-md overflow-hidden">
          {loading ? (
            <div className="text-center py-6 text-gray-400">Loading...</div>
          ) : tree.length === 0 ? (
            <div className="text-center py-6 text-gray-400">No data found</div>
          ) : (
            <TreeRows nodes={tree} />
          )}
        </div>
      </div>
    </div>
  );
}