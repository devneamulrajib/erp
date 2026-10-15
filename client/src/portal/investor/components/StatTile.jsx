import React from 'react';
import AmountText from './AmountText';
import PlainTooltip from './PlainTooltip';

const StatTile = ({ label, amount, count, tooltip }) => {
  return (
    <div className="rounded-2xl border border-[#E3E8F2] bg-white p-4 shadow-sm transition-all hover:border-slate-300">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-slate-500 font-wealth-body flex items-center">
          {label}
          {tooltip && <PlainTooltip term={label} explanation={tooltip} />}
        </span>
      </div>
      {amount !== undefined ? (
        <AmountText amount={amount} className="block text-xl font-bold text-[#0B1530] font-wealth-display tracking-tight" />
      ) : (
        <span className="block text-xl font-bold text-[#0B1530] font-wealth-display">{count}</span>
      )}
    </div>
  );
};

export default StatTile;