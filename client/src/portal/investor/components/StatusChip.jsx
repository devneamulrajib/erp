import React from 'react';

const StatusChip = ({ status = 'active' }) => {
  const s = String(status).toLowerCase();

  let styles = 'bg-slate-100 text-slate-600 border-slate-200';
  let label = s.charAt(0).toUpperCase() + s.slice(1);

  if (s === 'active') {
    styles = 'bg-emerald-50 text-emerald-700 border-emerald-200/60';
    label = 'Active';
  } else if (s === 'matured' || s === 'completed' || s === 'paid') {
    styles = 'bg-indigo-50 text-indigo-700 border-indigo-200/60';
    label = s === 'matured' ? 'Matured' : 'Completed';
  } else if (s === 'due_soon' || s === 'pending') {
    styles = 'bg-amber-50 text-amber-800 border-amber-200';
    label = s === 'due_soon' ? 'Due Soon' : 'Pending';
  }

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide ${styles}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {label}
    </span>
  );
};

export default StatusChip;