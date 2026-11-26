import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { ChevronDown, ChevronUp, LayoutGrid } from 'lucide-react';
import { getNavForUser } from './navConfig';
import MenuNode from './MenuNode';
import { USER_UPDATED_EVENT } from './SessionSync';

// Desktop floating menu can be minimised to a small "Menu" pill; remembered.
const HIDDEN_KEY = 'erp.topnav.hidden';

function readUser() {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
}

export default function ModuleNav({ badgeCounts = {}, itemBadgeCounts = {}, mobile = false, onNavigate }) {
  const [resetKey, setResetKey] = useState(0);
  const [user, setUser] = useState(readUser);
  // Same menu as before, limited to the sections this user may open (see getNavForUser).
  const modules = useMemo(() => getNavForUser(user), [user]);
  const [hidden, setHidden] = useState(() => localStorage.getItem(HIDDEN_KEY) === '1');
  const setHiddenSaved = (value) => {
    localStorage.setItem(HIDDEN_KEY, value ? '1' : '0');
    setHidden(value);
  };

  useEffect(() => {
    const refresh = () => setUser(readUser());
    window.addEventListener(USER_UPDATED_EVENT, refresh);
    return () => window.removeEventListener(USER_UPDATED_EVENT, refresh);
  }, []);
  const wrapperRef = useRef(null);

  const closeAll = useCallback(() => {
    setResetKey((key) => key + 1);
    onNavigate?.();
  }, [onNavigate]);

  useEffect(() => {
    if (mobile) return;
    const handleClickOutside = (event) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target)
      ) {
        closeAll();
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        closeAll();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [closeAll, mobile]);

  if (mobile) {
    return (
      <nav ref={wrapperRef} className="flex w-full flex-col gap-0.5">
        <div key={resetKey} className="flex flex-col gap-0.5">
          {modules.map((mod) => (
            <MenuNode
              key={mod.key}
              item={mod}
              depth={0}
              onNavigate={closeAll}
              badgeCount={badgeCounts[mod.key]}
              itemBadgeCounts={itemBadgeCounts}
              mobile
            />
          ))}
        </div>
      </nav>
    );
  }

  if (hidden) {
    return (
      <button
        type="button"
        onClick={() => setHiddenSaved(false)}
        title="Show menu"
        aria-label="Show menu"
        className="relative z-[99999] mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-black/[0.08] bg-white px-3.5 py-1.5 text-[11px] font-semibold text-slate-600 shadow-[0_6px_18px_rgba(0,0,0,0.10)] transition hover:text-slate-900"
      >
        <LayoutGrid size={13} /> Menu <ChevronDown size={13} />
      </button>
    );
  }

  return (
    <nav
      ref={wrapperRef}
      role="menubar"
      className="
        relative
        z-[99999]
        flex
        w-fit
        max-w-[calc(100vw-24px)]
        items-center
        overflow-visible
        rounded-[24px]
        border
        border-black/[0.08]
        bg-white
        px-1.5
        py-1.5
        shadow-[0_10px_30px_rgba(0,0,0,0.12)]
      "
    >
      <div
        key={resetKey}
        className="
          flex
          items-center
          gap-0.5
          overflow-visible
        "
      >
        {modules.map((mod) => (
          <MenuNode
            key={mod.key}
            item={mod}
            depth={0}
            onNavigate={closeAll}
            badgeCount={badgeCounts[mod.key]}
            itemBadgeCounts={itemBadgeCounts}
          />
        ))}
        <span className="mx-1 h-6 w-px shrink-0 bg-black/[0.08]" aria-hidden="true" />
        <button
          type="button"
          onClick={() => {
            closeAll();
            setHiddenSaved(true);
          }}
          title="Hide menu"
          aria-label="Hide menu"
          className="flex size-[34px] shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-[#f2f2f2] hover:text-slate-900"
        >
          <ChevronUp size={16} />
        </button>
      </div>
    </nav>
  );
}