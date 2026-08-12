import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export default function SelectColumnsDropdown({ columns, visible, onToggle, onClearAll, onSelectAll }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-3 py-2 border border-indigo-400 text-indigo-600 rounded-md text-sm font-medium hover:bg-indigo-50"
      >
        Select Columns
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-md shadow-lg z-50 p-3">
          {columns.map((col) => (
            <label key={col.key} className="flex items-center gap-2 py-1 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={!!visible[col.key]}
                onChange={(e) => onToggle(col.key, e.target.checked)}
                className="accent-indigo-500"
              />
              {col.label}
            </label>
          ))}
          <div className="flex gap-2 mt-2">
            <button onClick={onClearAll} className="flex-1 bg-cyan-400 text-white text-xs font-semibold rounded px-2 py-1.5 hover:bg-cyan-500">
              Clear All
            </button>
            <button onClick={onSelectAll} className="flex-1 bg-cyan-400 text-white text-xs font-semibold rounded px-2 py-1.5 hover:bg-cyan-500">
              Select All
            </button>
          </div>
        </div>
      )}
    </div>
  );
}