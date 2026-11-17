// client/src/components/MenuNode.jsx
import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronRight } from 'lucide-react';

function supportsHover() {
  if (typeof window === 'undefined' || !window.matchMedia) {
    return true;
  }
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

// Own count + counts of every descendant, so a parent like "Adjustment"
// lights up when something inside it has a new item.
function sumItemCounts(item, counts) {
  let total = counts[item.key] || 0;
  if (Array.isArray(item.children)) {
    item.children.forEach((child) => {
      total += sumItemCounts(child, counts);
    });
  }
  return total;
}

export default function MenuNode({
  item,
  depth = 0,
  onNavigate,
  badgeCount = 0,
  itemBadgeCounts = {},
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const [isOpen, setIsOpen] = useState(false);
  const [flipLeft, setFlipLeft] = useState(false);

  const nodeRef = useRef(null);
  const panelRef = useRef(null);
  const closeTimer = useRef(null);

  const hoverCapable = useRef(supportsHover());

  const hasChildren = Array.isArray(item.children) && item.children.length > 0;
  const isTopLevel = depth === 0;
  const Icon = item.icon;
  const isActive = item.route && location.pathname === item.route;
  const isHighlight = Boolean(item.highlight || item.key === 'office-budget');

  // Top-level uses the module count; submenu items use their own/descendant count.
  const count = isTopLevel ? Number(badgeCount) || 0 : sumItemCounts(item, itemBadgeCounts);

  useEffect(() => {
    return () => {
      clearTimeout(closeTimer.current);
    };
  }, []);

  // Detect edge collision and flip dropdown to the left if overflowing viewport
  useEffect(() => {
    if (!isOpen || !panelRef.current) return;

    const checkPosition = () => {
      if (!panelRef.current) return;
      const rect = panelRef.current.getBoundingClientRect();
      setFlipLeft(rect.right > window.innerWidth - 16);
    };

    requestAnimationFrame(checkPosition);
    window.addEventListener('resize', checkPosition);
    window.addEventListener('scroll', checkPosition, true);

    return () => {
      window.removeEventListener('resize', checkPosition);
      window.removeEventListener('scroll', checkPosition, true);
    };
  }, [isOpen, isTopLevel]);

  const openNow = () => {
    clearTimeout(closeTimer.current);
    setIsOpen(true);
  };

  const scheduleClose = () => {
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => {
      setIsOpen(false);
    }, 180);
  };

  const handleActivate = () => {
    if (hasChildren) {
      setIsOpen((current) => !current);
      return;
    }
    if (item.route) {
      navigate(item.route);
    }
    onNavigate?.();
  };

  const focusSibling = (direction) => {
    const parent = nodeRef.current?.parentElement;
    if (!parent) return;

    const siblings = Array.from(parent.querySelectorAll(':scope > div > [data-menu-item]'));
    const currentIndex = siblings.indexOf(nodeRef.current);
    if (currentIndex === -1) return;

    const nextIndex =
      direction === 1
        ? (currentIndex + 1) % siblings.length
        : (currentIndex - 1 + siblings.length) % siblings.length;

    siblings[nextIndex]?.focus();
  };

  const handleKeyDown = (event) => {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        handleActivate();
        break;
      case 'ArrowRight':
        if (hasChildren) {
          event.preventDefault();
          openNow();
          requestAnimationFrame(() => {
            panelRef.current?.querySelector('[data-menu-item]')?.focus();
          });
        }
        break;
      case 'ArrowLeft':
        if (depth > 0) {
          event.preventDefault();
          setIsOpen(false);
          nodeRef.current?.focus();
        }
        break;
      case 'Escape':
        event.preventDefault();
        setIsOpen(false);
        nodeRef.current?.focus();
        break;
      case 'ArrowDown':
        event.preventDefault();
        focusSibling(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        focusSibling(-1);
        break;
      default:
        break;
    }
  };

  const hoverHandlers =
    hasChildren && hoverCapable.current
      ? {
          onMouseEnter: openNow,
          onMouseLeave: scheduleClose,
        }
      : {};

  return (
    <div className="relative overflow-visible" {...hoverHandlers}>
      {/* =====================================================
          MENU TRIGGER BUTTON
      ====================================================== */}
      <button
        ref={nodeRef}
        data-menu-item
        type="button"
        role="menuitem"
        aria-haspopup={hasChildren ? 'menu' : undefined}
        aria-expanded={hasChildren ? isOpen : undefined}
        onClick={handleActivate}
        onKeyDown={handleKeyDown}
        className={`
          group
          relative
          flex
          items-center
          whitespace-nowrap
          transition-all
          duration-200
          ease-out

          ${
            isTopLevel
              ? 'h-[38px] gap-2 rounded-[18px] px-4 text-[12px] font-medium'
              : 'w-full gap-2.5 rounded-[12px] px-3 py-2 text-left text-[13px]'
          }

          ${
            isTopLevel
              ? isOpen || isActive
                ? 'bg-black text-white shadow-[0_4px_12px_rgba(0,0,0,0.18)]'
                : 'bg-transparent text-[#202020] hover:bg-[#f2f2f2]'
              : isActive
              ? 'bg-black text-white font-semibold'
              : isHighlight
              ? `
                  bg-gradient-to-r from-blue-50/90 via-indigo-50/70 to-blue-50/40
                  text-blue-900 font-bold
                  border border-blue-200/80
                  shadow-[0_2px_8px_rgba(37,99,235,0.06)]
                  hover:from-blue-100 hover:to-indigo-100
                  hover:border-blue-300
                `
              : count > 0
              ? 'bg-rose-50/70 text-[#252525] font-semibold hover:bg-rose-50'
              : 'bg-transparent text-[#252525] font-medium hover:bg-[#f3f3f3]'
          }
        `}
      >
        {/* ICON */}
        {Icon && (
          <Icon
            size={15}
            strokeWidth={isHighlight && !isActive ? 2.2 : 1.8}
            className={`
              shrink-0
              transition-transform
              duration-200

              ${isHighlight && !isActive ? 'text-blue-600' : ''}
              ${isOpen ? 'scale-105' : 'group-hover:scale-105'}
            `}
          />
        )}

        {/* LABEL */}
        <span className="truncate">{item.label}</span>

        {/* NEW-ITEM COUNT BADGE */}
        {count > 0 && (
          <span
            title={`${count} new`}
            className={`
              flex
              shrink-0
              items-center
              justify-center
              rounded-full
              bg-rose-500
              font-bold
              leading-none
              text-white
              ${
                isTopLevel
                  ? 'h-[18px] min-w-[18px] px-1 text-[10px] ring-2 ring-white'
                  : 'h-[18px] min-w-[18px] px-1.5 text-[10px]'
              }
            `}
          >
            <span className="relative flex items-center justify-center">
              {count > 9 ? '9+' : count}
            </span>
          </span>
        )}

        {/* HIGHLIGHT PILL BADGE FOR SUBMENU */}
        {!isTopLevel && isHighlight && !isActive && (
          <span className="ml-1 rounded-md bg-blue-600 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-white shadow-xs">
            HUB
          </span>
        )}

        {/* CHEVRON INDICATOR */}
        {hasChildren && (
          <span className="ml-auto flex shrink-0 items-center pl-1.5">
            {isTopLevel ? (
              <ChevronDown
                size={13}
                strokeWidth={1.8}
                className={`
                  transition-transform
                  duration-200
                  ${isOpen ? 'rotate-180' : ''}
                `}
              />
            ) : (
              <ChevronRight
                size={14}
                strokeWidth={isHighlight ? 2.2 : 1.8}
                className={`
                  ${isHighlight && !isActive ? 'text-blue-600' : 'text-current opacity-50'}
                `}
              />
            )}
          </span>
        )}
      </button>

      {/* =====================================================
          DROPDOWN POPUP PANEL
      ====================================================== */}
      {hasChildren && (
        <div
          ref={panelRef}
          role="menu"
          aria-hidden={!isOpen}
          onMouseEnter={hoverCapable.current ? openNow : undefined}
          onMouseLeave={hoverCapable.current ? scheduleClose : undefined}
          className={`
            absolute
            z-[999999]
            overflow-visible

            rounded-[16px]
            border
            border-black/[0.08]
            bg-white
            p-1.5

            shadow-[0_18px_45px_rgba(0,0,0,0.16)]

            transition-all
            duration-150
            ease-out

            ${
              isOpen
                ? 'visible pointer-events-auto translate-y-0 scale-100 opacity-100'
                : 'invisible pointer-events-none translate-y-1 scale-[0.98] opacity-0'
            }

            ${
              isTopLevel
                ? `top-full mt-2 w-[240px] ${flipLeft ? 'right-0' : 'left-0'}`
                : `top-0 w-[230px] ${flipLeft ? 'right-full mr-2' : 'left-full ml-2'}`
            }
          `}
        >
          {/* Top-level subtle pointer arrow */}
          {isTopLevel && (
            <div
              className={`
                absolute
                -top-1.5
                h-3
                w-3
                rotate-45
                border-l
                border-t
                border-black/[0.08]
                bg-white
                ${flipLeft ? 'right-7' : 'left-7'}
              `}
            />
          )}

          {/* Child menu tree */}
          <div className="relative flex flex-col gap-0.5">
            {item.children.map((child) => (
              <MenuNode
                key={child.key}
                item={child}
                depth={depth + 1}
                onNavigate={onNavigate}
                itemBadgeCounts={itemBadgeCounts}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}