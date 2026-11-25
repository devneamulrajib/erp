import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { getNavForUser } from './navConfig';
import MenuNode from './MenuNode';
import { USER_UPDATED_EVENT } from './SessionSync';

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
      </div>
    </nav>
  );
}