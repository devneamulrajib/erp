import { useState, useRef, useEffect, useCallback } from 'react';
import { TOP_MODULES } from './navConfig';
import MenuNode from './MenuNode';

export default function ModuleNav({ badgeCounts = {} }) {
  const [resetKey, setResetKey] = useState(0);
  const wrapperRef = useRef(null);

  const closeAll = useCallback(() => {
    setResetKey((key) => key + 1);
  }, []);

  useEffect(() => {
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
  }, [closeAll]);

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
        {TOP_MODULES.map((mod) => (
          <MenuNode
            key={mod.key}
            item={mod}
            depth={0}
            onNavigate={closeAll}
            badgeCount={badgeCounts[mod.key]}
          />
        ))}
      </div>
    </nav>
  );
}