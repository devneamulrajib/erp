// client/src/components/GlobalSearch.jsx
import { useState, useRef, useEffect, useMemo, forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, CornerDownLeft, X } from 'lucide-react';
import { getModulesForRole } from './navConfig';

/* ------------------------------------------------------------------
   Build the searchable index from navConfig (permission-aware)
------------------------------------------------------------------- */
function readCurrentUser() {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function buildSearchIndex(user) {
  const modules = getModulesForRole(user);
  const index = [];
  const seen = new Set();

  const add = (entry) => {
    const id = `${entry.path}|${entry.label}`;
    if (seen.has(id)) return;
    seen.add(id);
    index.push(entry);
  };

  // trail = parent group names below the top module, e.g. ["Reports"]
  const walk = (items, top, trail) => {
    for (const item of items) {
      if (item.route) {
        add({
          label: item.label,
          section: top.label,
          trail: trail.join(' › '),
          path: item.route,
          keywords: [top.shortLabel, ...trail].filter(Boolean).join(' '),
        });
      }
      if (item.children?.length) {
        walk(item.children, top, [...trail, item.label]);
      }
    }
  };

  modules.forEach((m) => {
    if (m.route) {
      add({
        label: m.label,
        section: m.label,
        trail: '',
        path: m.route,
        keywords: m.shortLabel || '',
      });
    }
    walk(m.children || [], m, []);
  });

  // Pages that live outside the main menu
  const role = String(user?.role || '').toLowerCase();
  if (role.includes('admin')) {
    add({
      label: 'Support Tickets',
      section: 'Support',
      trail: '',
      path: '/support-tickets',
      keywords: 'help issues tickets',
    });
  }

  return index;
}

/* ------------------------------------------------------------------
   Scoring
------------------------------------------------------------------- */
function scoreItem(item, terms) {
  const label = item.label.toLowerCase();
  const section = item.section.toLowerCase();
  const trail = (item.trail || '').toLowerCase();
  const extra = (item.keywords || '').toLowerCase();
  let total = 0;

  for (const term of terms) {
    if (label.startsWith(term)) total += 100;
    else if (label.split(/[\s/&-]+/).some((w) => w.startsWith(term))) total += 70;
    else if (label.includes(term)) total += 50;
    else if (trail.includes(term)) total += 35;
    else if (section.includes(term)) total += 30;
    else if (extra.includes(term)) total += 20;
    else return 0; // every typed word must match something
  }
  return total;
}

function Highlight({ text, terms }) {
  if (!terms.length) return text;
  const pattern = new RegExp(
    `(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
    'ig'
  );
  return text.split(pattern).map((part, i) =>
    terms.includes(part.toLowerCase()) ? (
      <mark key={i} className="rounded bg-amber-100 px-0 text-slate-900">
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

/* ------------------------------------------------------------------
   Component
------------------------------------------------------------------- */
const GlobalSearch = forwardRef(function GlobalSearch(
  {
    placeholder,
    className = '',
    inputClassName = '',
    showShortcut = false,
    autoFocus = false,
    onDone,
    items, // optional override
  },
  ref
) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef(null);
  const listRef = useRef(null);

  const index = useMemo(() => items || buildSearchIndex(readCurrentUser()), [items]);

  const terms = useMemo(
    () => query.toLowerCase().split(/\s+/).filter(Boolean),
    [query]
  );

  const results = useMemo(() => {
    if (!terms.length) return [];
    return index
      .map((item) => ({ item, score: scoreItem(item, terms) }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score || a.item.label.localeCompare(b.item.label))
      .slice(0, 10)
      .map((r) => r.item);
  }, [index, terms]);

  useEffect(() => setActive(0), [query]);

  // Close when clicking outside
  useEffect(() => {
    function onDown(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, []);

  // Keep the active row in view
  useEffect(() => {
    listRef.current?.children[active]?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  function go(item) {
    if (!item) return;
    navigate(item.path);
    setQuery('');
    setOpen(false);
    onDone?.();
  }

  function onKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (results.length ? (i + 1) % results.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (results.length ? (i - 1 + results.length) % results.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      go(results[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  const showPanel = open && terms.length > 0;

  return (
    <div ref={wrapRef} className={`relative group ${className}`}>
      <Search
        size={15}
        className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-slate-800"
      />
      <input
        ref={ref}
        type="text"
        value={query}
        autoFocus={autoFocus}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        role="combobox"
        aria-expanded={showPanel}
        aria-controls="global-search-results"
        aria-autocomplete="list"
        className={inputClassName}
      />

      {query ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            setQuery('');
            ref?.current?.focus();
          }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-700"
        >
          <X size={14} />
        </button>
      ) : (
        showShortcut && (
          <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
            <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 shadow-2xs">
              ⌘K
            </kbd>
          </div>
        )
      )}

      {showPanel && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-2xl ring-1 ring-black/5">
          {results.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-xs font-semibold text-slate-800">No results for “{query}”</p>
              <p className="mt-0.5 text-[11px] text-slate-400">Try a module or page name.</p>
            </div>
          ) : (
            <ul
              id="global-search-results"
              ref={listRef}
              role="listbox"
              className="max-h-96 overflow-y-auto p-1.5"
            >
              {results.map((item, i) => (
                <li key={`${item.path}|${item.label}`} role="option" aria-selected={i === active}>
                  <button
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(item)}
                    className={`flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left transition-colors ${
                      i === active ? 'bg-slate-100' : 'hover:bg-slate-50'
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-medium text-slate-800">
                        <Highlight text={item.label} terms={terms} />
                      </span>
                      {item.trail && (
                        <span className="block truncate text-[10px] text-slate-400">
                          {item.trail}
                        </span>
                      )}
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-slate-500">
                        {item.section}
                      </span>
                      {i === active && <CornerDownLeft size={12} className="text-slate-400" />}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
});

export default GlobalSearch;