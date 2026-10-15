import React from 'react';

const EmptyState = ({ title = 'No data available', description, actionLabel, onAction }) => {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 p-8 text-center my-4">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      </div>
      <h4 className="text-sm font-semibold text-[#0B1530] font-wealth-display">{title}</h4>
      {description && <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto font-wealth-body">{description}</p>}
      {actionLabel && (
        <button
          onClick={onAction}
          className="mt-4 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-700 transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;