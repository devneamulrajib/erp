import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronRight } from 'lucide-react';

// Detected once — decides whether we attach hover handlers at all.
// Touch devices skip hover entirely and rely on click/tap.
function supportsHover() {
  if (typeof window === 'undefined' || !window.matchMedia) return true;
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

/**
 * Recursive nav node — renders unlimited nesting depth.
 * depth 0   = top bar trigger, dropdown opens below it (your old TOP_MODULES row).
 * depth >0  = submenu row, flyout opens to the side (flips left near viewport edge).
 */
export default function MenuNode({ item, depth = 0, onNavigate }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [flipLeft, setFlipLeft] = useState(false);
  const nodeRef = useRef(null);
  const panelRef = useRef(null);
  const closeTimer = useRef(null);
  const hoverCapable = useRef(supportsHover());

  const hasChildren = !!(item.children && item.children.length);
  const isActive = item.route && location.pathname === item.route;
  const isTopLevel = depth === 0;
  const Icon = item.icon;

  useEffect(() => {
    if (!isOpen || !panelRef.current) return;
    const rect = panelRef.current.getBoundingClientRect();
    setFlipLeft(rect.right > window.innerWidth - 8);
  }, [isOpen]);

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  function openNow() {
    clearTimeout(closeTimer.current);
    setIsOpen(true);
  }

  function scheduleClose() {
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setIsOpen(false), 150);
  }

  function handleActivate() {
    if (hasChildren) {
      setIsOpen((v) => !v);
    } else {
      if (item.route) navigate(item.route);
      onNavigate?.();
    }
  }

  function focusSibling(direction) {
    const group = nodeRef.current?.parentElement?.parentElement;
    const siblings = Array.from(group?.querySelectorAll(':scope > div > [data-menu-item]') || []);
    const idx = siblings.indexOf(nodeRef.current);
    if (idx === -1) return;
    const nextIdx = direction === 1 ? (idx + 1) % siblings.length : (idx - 1 + siblings.length) % siblings.length;
    siblings[nextIdx]?.focus();
  }

  function handleKeyDown(e) {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        handleActivate();
        break;
      case 'ArrowRight':
        if (hasChildren) {
          e.preventDefault();
          openNow();
          requestAnimationFrame(() => panelRef.current?.querySelector('[data-menu-item]')?.focus());
        }
        break;
      case 'ArrowLeft':
        if (depth > 0) {
          e.preventDefault();
          setIsOpen(false);
          nodeRef.current?.focus();
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        nodeRef.current?.focus();
        break;
      case 'ArrowDown':
        e.preventDefault();
        focusSibling(1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        focusSibling(-1);
        break;
      default:
        break;
    }
  }

  const hoverHandlers = hasChildren && hoverCapable.current
    ? { onMouseEnter: openNow, onMouseLeave: scheduleClose }
    : {};

  return (
    <div className="relative" {...hoverHandlers}>
      <button
        ref={nodeRef}
        data-menu-item
        type="button"
        role={isTopLevel ? undefined : 'menuitem'}
        aria-haspopup={hasChildren ? 'menu' : undefined}
        aria-expanded={hasChildren ? isOpen : undefined}
        onClick={handleActivate}
        onKeyDown={handleKeyDown}
        className={
          isTopLevel
            ? `flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
                isActive || isOpen ? 'bg-indigo-500 text-white' : 'text-gray-600 hover:bg-gray-200'
              }`
            : `flex items-center justify-between gap-2 w-full text-left px-3 py-2 text-sm transition-colors ${
                isActive ? 'bg-indigo-50 text-indigo-600 font-medium' : 'text-gray-700 hover:bg-gray-100'
              }`
        }
      >
        <span className="flex items-center gap-2">
          {Icon && <Icon size={15} />}
          {item.label}
        </span>
        {hasChildren && (
          isTopLevel
            ? <ChevronDown size={13} />
            : <ChevronRight size={13} className="text-gray-400" />
        )}
      </button>

      {hasChildren && (
        <div
          ref={panelRef}
          role="menu"
          aria-hidden={!isOpen}
          onMouseEnter={hoverCapable.current ? openNow : undefined}
          onMouseLeave={hoverCapable.current ? scheduleClose : undefined}
          className={`absolute z-50 py-1 bg-white border border-gray-200 rounded-md shadow-lg
            transition-all duration-150 ease-out origin-top
            ${isOpen ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}
            ${isTopLevel
              ? `top-full mt-1 w-56 ${flipLeft ? 'right-0' : 'left-0'}`
              : `top-0 w-52 ${flipLeft ? 'right-full mr-0.5' : 'left-full ml-0.5'}`
            }`}
        >
          {item.children.map((child) => (
            <MenuNode
              key={child.key}
              item={child}
              depth={depth + 1}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}