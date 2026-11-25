// client/src/components/ResponsiveTable.jsx
// Shared responsive table. On screens below 768px (md), each row renders as a
// stacked card with "label: value" pairs. On md and up it renders a normal
// table. Desktop appearance is unchanged.
//
// Usage:
// <ResponsiveTable
//   columns={[
//     { key: 'voucherNo', label: 'Voucher No' },
//     { key: 'date', label: 'Date' },
//     { key: 'amount', label: 'Amount', render: (row) => <span>{row.amount}</span> },
//   ]}
//   data={rows}
//   rowKey="id"
// />
//
// Fallback for existing tables: wrap them in <div className="overflow-x-auto">.

import { useMemo } from 'react';

export default function ResponsiveTable({
  columns = [],
  data = [],
  rowKey = 'id',
  className = '',
  emptyText = 'No records found',
  onRowClick,
}) {
  const visibleColumns = useMemo(
    () => columns.filter((col) => col && col.key && col.label),
    [columns]
  );

  if (!data.length) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
        {emptyText}
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Desktop / tablet table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
              {visibleColumns.map((col) => (
                <th key={col.key} className="px-3 py-2.5">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((row) => (
              <tr
                key={row[rowKey] ?? JSON.stringify(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={onRowClick ? 'cursor-pointer hover:bg-slate-50' : ''}
              >
                {visibleColumns.map((col) => (
                  <td key={col.key} className="px-3 py-2.5 text-slate-800">
                    {col.render ? col.render(row) : row[col.key] ?? '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 md:hidden">
        {data.map((row) => (
          <div
            key={row[rowKey] ?? JSON.stringify(row)}
            onClick={onRowClick ? () => onRowClick(row) : undefined}
            className={`rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs ${
              onRowClick ? 'cursor-pointer active:bg-slate-50' : ''
            }`}
          >
            <dl className="space-y-1.5">
              {visibleColumns.map((col) => (
                <div key={col.key} className="flex items-start justify-between gap-3 text-[13px]">
                  <dt className="shrink-0 font-medium text-slate-500">{col.label}</dt>
                  <dd className="min-w-0 text-right text-slate-800">
                    {col.render ? col.render(row) : row[col.key] ?? '—'}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
    </div>
  );
}