import React from 'react';

const ProgressBar = ({ startDate, maturityDate, label = 'Term elapsed' }) => {
  if (!startDate || !maturityDate) return null;

  const start = new Date(startDate).getTime();
  const end = new Date(maturityDate).getTime();
  const now = Date.now();

  let percent = 0;
  if (end > start) {
    percent = Math.min(100, Math.max(0, Math.round(((now - start) / (end - start)) * 100)));
  }

  return (
    <div className="w-full">
      <div className="flex justify-between text-[11px] text-slate-500 mb-1.5 font-wealth-body">
        <span>{label}</span>
        <span className="font-semibold text-slate-700">{percent}%</span>
      </div>
      <div 
        className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100" 
        role="progressbar" 
        aria-valuenow={percent} 
        aria-valuemin="0" 
        aria-valuemax="100"
      >
        <div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-700"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};

export default ProgressBar;