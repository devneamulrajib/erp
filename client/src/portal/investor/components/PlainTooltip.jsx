import React, { useState } from 'react';

const PlainTooltip = ({ term, explanation }) => {
  const [visible, setVisible] = useState(false);

  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => setVisible(v => !v)}
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 focus:outline-hidden"
        aria-label={`Explain ${term}`}
      >
        ?
      </button>

      {visible && (
        <span className="absolute bottom-full left-1/2 z-40 mb-2 -translate-x-1/2 whitespace-normal rounded-xl border border-slate-200 bg-white p-3 text-xs font-normal text-slate-700 shadow-xl max-w-xs w-64 leading-relaxed font-wealth-body animate-fadeIn">
          <strong className="block font-semibold text-[#0B1530] mb-1">{term}</strong>
          {explanation}
        </span>
      )}
    </span>
  );
};

export default PlainTooltip;