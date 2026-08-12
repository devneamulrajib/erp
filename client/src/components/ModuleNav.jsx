import { useState, useRef, useEffect, useCallback } from 'react';
import { TOP_MODULES } from './navConfig';
import MenuNode from './MenuNode';

export default function ModuleNav() {
  const [resetKey, setResetKey] = useState(0);
  const wrapperRef = useRef(null);

  // Forces the whole tree to remount, collapsing every open dropdown/flyout
  // at any depth — simpler and safer than threading close-state through
  // every level like the old openMenu/openSubmenu pair did.
  const closeAll = useCallback(() => setResetKey((k) => k + 1), []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        closeAll();
      }
    }
    function handleEscape(e) {
      if (e.key === 'Escape') closeAll();
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [closeAll]);

  return (
    <nav
      ref={wrapperRef}
      role="menubar"
      className="relative flex items-center gap-1 bg-gray-100 px-2 py-1.5 border-b border-gray-200 overflow-visible"
    >
      <div key={resetKey} className="contents">
        {TOP_MODULES.map((mod) => (
          <MenuNode key={mod.key} item={mod} depth={0} onNavigate={closeAll} />
        ))}
      </div>
    </nav>
  );
}