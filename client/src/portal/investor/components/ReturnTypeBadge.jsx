import React from 'react';

export const RETURN_TYPES = {
  fixed_return: {
    label: 'Fixed return',
    description:
      'A fixed percentage return agreed in advance. It does not change with how the project performs.',
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  project_based: {
    label: 'Project profit share',
    description:
      "Your return is a share of the project's net profit, so it rises or falls with project performance.",
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  equity: {
    label: 'Equity (hybrid)',
    description:
      'You earn the higher of the agreed fixed floor or your share of the project profit.',
    badge: 'bg-amber-50 text-amber-800 border-amber-200',
  },
};

const humanize = (v) => {
  const s = String(v || '').replace(/_/g, ' ').trim();
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Standard';
};

export const getReturnType = (type) =>
  RETURN_TYPES[type] || {
    label: humanize(type),
    description: 'Return terms are set out in your signed agreement.',
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
  };

// One-line rate text from an investor-portal investment object
export const rateLabel = (inv) => {
  const roi = inv.expectedRoiPercentage;
  const share = inv.profitSharePercentage;
  if (inv.investmentType === 'fixed_return') return roi ? `${roi}% fixed` : 'Fixed return';
  if (inv.investmentType === 'project_based') return share ? `${share}% of project profit` : 'Profit share';
  if (inv.investmentType === 'equity') {
    const parts = [];
    if (share) parts.push(`${share}% share`);
    if (roi) parts.push(`${roi}% floor`);
    return parts.join(' · ') || 'Equity';
  }
  return '';
};

const ReturnTypeBadge = ({ type, className = '' }) => {
  const t = getReturnType(type);
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold ${t.badge} ${className}`}
    >
      {t.label}
    </span>
  );
};

export default ReturnTypeBadge;