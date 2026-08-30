import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, X, Search } from 'lucide-react';

export default function SearchableSelect({
  options = [],
  value,
  onChange,
  placeholder = 'Select...',
  clearable = false,
  disabled = false,
  className = '',
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);
  const ref = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setQuery('');
        setActiveIndex(-1);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = useMemo(
    () => options.filter((opt) => opt.label.toLowerCase().includes(query.toLowerCase())),
    [options, query]
  );

  // Defensive: only show a "selected" label if the value actually matches a
  // current option. A stale/removed value silently falls back to the placeholder
  // instead of displaying a mismatched label.
  const selectedOption = options.find((o) => o.value === value);
  const selectedLabel = selectedOption?.label;

  function openDropdown() {
    if (disabled) return;
    setOpen(true);
    setActiveIndex(filtered.findIndex((o) => o.value === value));
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function closeDropdown() {
    setOpen(false);
    setQuery('');
    setActiveIndex(-1);
  }

  function selectOption(opt) {
    onChange(opt.value);
    closeDropdown();
  }

  function handleClear(e) {
    e.stopPropagation();
    onChange('');
    closeDropdown();
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      closeDropdown();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[activeIndex]) selectOption(filtered[activeIndex]);
      return;
    }
  }

  useEffect(() => {
    if (open && listRef.current) {
      const activeEl = listRef.current.children[activeIndex];
      activeEl?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex, open]);

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => (open ? closeDropdown() : openDropdown())}
        className={`w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm text-left border transition-colors ${
          disabled
            ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
            : open
            ? 'bg-white border-indigo-400 ring-2 ring-indigo-500/30'
            : 'bg-white border-slate-200 hover:border-slate-300'
        }`}
      >
        <span className={`truncate ${selectedLabel ? 'text-slate-800' : 'text-slate-400'}`}>
          {selectedLabel || placeholder}
        </span>
        <span className="flex items-center gap-1 shrink-0">
          {clearable && selectedLabel && !disabled && (
            <span
              role="button"
              tabIndex={-1}
              onClick={handleClear}
              className="p-0.5 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              title="Clear"
            >
              <X size={13} />
            </span>
          )}
          <ChevronDown
            size={15}
            className={`text-slate-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          />
        </span>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 w-full min-w-[200px] bg-white border border-slate-200 rounded-lg shadow-lg shadow-slate-900/10 z-50 overflow-hidden">
          <div className="relative border-b border-slate-100">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setActiveIndex(0); }}
              onKeyDown={handleKeyDown}
              placeholder="Search..."
              className="w-full pl-9 pr-3 py-2.5 text-sm focus:outline-none placeholder:text-slate-400"
            />
          </div>
          <div ref={listRef} className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-slate-400">No results found</div>
            ) : (
              filtered.map((opt, i) => {
                const isSelected = opt.value === value;
                const isActive = i === activeIndex;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onMouseEnter={() => setActiveIndex(i)}
                    onClick={() => selectOption(opt)}
                    className={`w-full flex items-center justify-between gap-2 text-left px-3 py-2 text-sm transition-colors ${
                      isSelected
                        ? 'text-indigo-600 font-medium bg-indigo-50/70'
                        : isActive
                        ? 'bg-slate-50 text-slate-700'
                        : 'text-slate-700'
                    }`}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && <Check size={14} className="text-indigo-600 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}