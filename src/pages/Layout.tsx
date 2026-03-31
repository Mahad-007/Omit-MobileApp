import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef, useCallback } from "react";
import { storage } from "@/lib/storage";
import {
  LayoutGrid,
  ListTodo,
  BarChart2,
  User,
  Timer,
  Shield
} from "lucide-react";
import { useSwipeNavigation } from "@/hooks/useSwipeNavigation";

const TAB_ROUTES = ['/', '/tasks', '/stats', '/settings'];

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [focusModeActive, setFocusModeActive] = useState(false);

  useEffect(() => {
    const checkSession = () => {
      const session = storage.getActiveSession();
      setFocusModeActive(!!session);
    };

    checkSession();

    const unsubscribe = storage.onChange('all', checkSession);
    window.addEventListener('storage', checkSession);

    return () => {
      unsubscribe();
      window.removeEventListener('storage', checkSession);
    };
  }, []);

  const handleStartFocus = () => {
    if (focusModeActive) {
      navigate('/timer');
    } else {
      navigate('/blocker');
    }
  };

  const hideNav = location.pathname === '/timer' || location.pathname === '/blocked';

  const navItems = [
    { path: '/', icon: LayoutGrid, label: 'Focus' },
    { path: '/tasks', icon: ListTodo, label: 'Tasks' },
    // FAB goes here (center)
    { path: '/stats', icon: BarChart2, label: 'Stats' },
    { path: '/settings', icon: User, label: 'More' },
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  // ── Swipe navigation ──────────────────────────────────────────────────────
  const mainRef = useRef<HTMLDivElement>(null);
  // Track which direction the last swipe went so the new page animates in correctly
  const navDirectionRef = useRef<'left' | 'right' | null>(null);

  /** Apply a CSS transform directly to the DOM — zero React re-renders */
  const applyTransform = useCallback(
    (offsetPx: number, withTransition = false) => {
      if (!mainRef.current) return;
      mainRef.current.style.transition = withTransition
        ? 'transform 0.32s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        : 'none';
      mainRef.current.style.transform =
        offsetPx !== 0 ? `translateX(${offsetPx}px)` : '';
    },
    []
  );

  const handleDrag = useCallback(
    (offset: number) => {
      applyTransform(offset);
    },
    [applyTransform]
  );

  const handleNavigate = useCallback(
    (route: string, direction: 'left' | 'right') => {
      navDirectionRef.current = direction;
      // Reset transform before the new page mounts so it starts at 0
      applyTransform(0);
      navigate(route);
    },
    [navigate, applyTransform]
  );

  const handleCancel = useCallback(() => {
    // Snap back to centre with a smooth spring
    applyTransform(0, true);
  }, [applyTransform]);

  const swipeHandlers = useSwipeNavigation({
    routes: TAB_ROUTES,
    threshold: 55,
    onDrag: handleDrag,
    onNavigate: handleNavigate,
    onCancel: handleCancel,
  });

  // Attach native (non-passive) touch listeners so we can call preventDefault()
  // during horizontal swipes, preventing Android from simultaneously scrolling
  // while we animate the page drag. React's synthetic events are passive by
  // default and cannot call preventDefault(), causing scroll/swipe fighting.
  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;
    el.addEventListener('touchstart', swipeHandlers.onTouchStart, { passive: true });
    el.addEventListener('touchmove',  swipeHandlers.onTouchMove,  { passive: false });
    el.addEventListener('touchend',   swipeHandlers.onTouchEnd,   { passive: true });
    return () => {
      el.removeEventListener('touchstart', swipeHandlers.onTouchStart);
      el.removeEventListener('touchmove',  swipeHandlers.onTouchMove);
      el.removeEventListener('touchend',   swipeHandlers.onTouchEnd);
    };
  }, [swipeHandlers.onTouchStart, swipeHandlers.onTouchMove, swipeHandlers.onTouchEnd]);


  // Determine animation class for the incoming page
  const enterClass =
    navDirectionRef.current === 'left'
      ? 'page-enter-from-right'
      : navDirectionRef.current === 'right'
      ? 'page-enter-from-left'
      : '';

  return (
    <div className="app-container bg-background min-h-screen">
      {/* overflow-x-hidden keeps sliding pages from creating a horizontal scrollbar */}
      <main
        ref={mainRef}
        className="flex-1 overflow-x-hidden"
        style={{
          // Tell the browser we handle horizontal gestures so it doesn't wait
          // ~300ms before routing touches to JS (eliminates Android swipe delay)
          touchAction: 'pan-y',
          // Promote to its own GPU compositor layer so transforms are handled
          // by the GPU rather than re-painting on the CPU each frame
          willChange: 'transform',
          backfaceVisibility: 'hidden',
        }}
      >
        {/*
          key={location.key} — remounts this div on every navigation so the
          CSS animation restarts automatically for every page change.
        */}
        <div key={location.key} className={enterClass}>
          <Outlet />
        </div>
      </main>

      {/* Premium Bottom Navigation - Focus First Design */}
      {!hideNav && (
        <nav className="app-nav-container">
          {/* Gradient fade background */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/95 to-transparent pointer-events-none" style={{ height: '120%', top: '-20%' }} />

          {/* Navigation bar */}
          <div className="relative glass-blur bg-card/80 border-t border-border/20 px-6 tablet:px-10 py-3 tablet:py-4 flex justify-between items-center">
            {/* Left nav items */}
            {navItems.slice(0, 2).map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center gap-1 min-w-[56px] tablet:min-w-[80px] transition-colors duration-250 ${
                  isActive(item.path) ? 'text-primary' : 'text-muted-foreground hover:text-foreground/70'
                }`}
              >
                <div className={`p-2 tablet:p-2.5 rounded-xl ${
                  isActive(item.path) ? 'bg-primary/12' : ''
                }`}
                  style={{
                    transition: 'background-color 0.28s cubic-bezier(0.22,1,0.36,1), box-shadow 0.28s ease, transform 0.25s cubic-bezier(0.34,1.56,0.64,1)',
                    boxShadow: isActive(item.path) ? '0 0 18px hsl(var(--primary) / 0.28)' : 'none',
                    transform: isActive(item.path) ? 'scale(1.1)' : 'scale(1)',
                  }}
                >
                  <item.icon
                    className="w-5 h-5 tablet:w-6 tablet:h-6"
                    strokeWidth={isActive(item.path) ? 2.5 : 1.8}
                    style={{ transition: 'stroke-width 0.2s ease' }}
                  />
                </div>
                <span className="text-[10px] tablet:text-xs font-bold uppercase tracking-tight leading-none">{item.label}</span>
                {/* Active indicator dot */}
                <div
                  className="nav-active-dot"
                  style={{
                    opacity: isActive(item.path) ? 1 : 0,
                    transform: isActive(item.path) ? 'scaleX(1)' : 'scaleX(0)',
                  }}
                />
              </button>
            ))}

            {/* Center Floating Focus Button - THE PRIMARY ACTION */}
            <div className="relative -top-7 tablet:-top-9">
              <button
                onClick={handleStartFocus}
                className="relative flex size-14 tablet:size-16 items-center justify-center rounded-2xl text-white transition-all hover:scale-105 press-effect"
                style={{
                  background: focusModeActive
                    ? 'var(--gradient-accent)'
                    : 'var(--gradient-primary)',
                  boxShadow: focusModeActive
                    ? '0 8px 32px hsla(38, 92%, 50%, 0.5), 0 0 40px hsla(38, 92%, 50%, 0.3)'
                    : '0 8px 32px hsla(258, 85%, 65%, 0.4), 0 4px 12px hsla(258, 85%, 65%, 0.3)'
                }}
              >
                {focusModeActive ? <Timer className="w-7 h-7 tablet:w-8 tablet:h-8" strokeWidth={2.5} /> : <Shield className="w-7 h-7 tablet:w-8 tablet:h-8" strokeWidth={2.5} />}
                {focusModeActive && (
                  <div
                    className="absolute -top-1 -right-1 size-4 rounded-full border-2 border-background animate-subtle-pulse"
                    style={{ backgroundColor: 'hsl(var(--highlight))' }}
                  />
                )}
              </button>
            </div>

            {/* Right nav items */}
            {navItems.slice(2).map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center gap-1 min-w-[56px] tablet:min-w-[80px] transition-colors duration-250 ${
                  isActive(item.path) ? 'text-primary' : 'text-muted-foreground hover:text-foreground/70'
                }`}
              >
                <div className={`p-2 tablet:p-2.5 rounded-xl ${
                  isActive(item.path) ? 'bg-primary/12' : ''
                }`}
                  style={{
                    transition: 'background-color 0.28s cubic-bezier(0.22,1,0.36,1), box-shadow 0.28s ease, transform 0.25s cubic-bezier(0.34,1.56,0.64,1)',
                    boxShadow: isActive(item.path) ? '0 0 18px hsl(var(--primary) / 0.28)' : 'none',
                    transform: isActive(item.path) ? 'scale(1.1)' : 'scale(1)',
                  }}
                >
                  <item.icon
                    className="w-5 h-5 tablet:w-6 tablet:h-6"
                    strokeWidth={isActive(item.path) ? 2.5 : 1.8}
                    style={{ transition: 'stroke-width 0.2s ease' }}
                  />
                </div>
                <span className="text-[10px] tablet:text-xs font-bold uppercase tracking-tight leading-none">{item.label}</span>
                {/* Active indicator dot */}
                <div
                  className="nav-active-dot"
                  style={{
                    opacity: isActive(item.path) ? 1 : 0,
                    transform: isActive(item.path) ? 'scaleX(1)' : 'scaleX(0)',
                  }}
                />
              </button>
            ))}
          </div>
        </nav>
      )}

      {/* Bottom Safe Area Spacer */}
      {!hideNav && <div className="h-24 tablet:h-28" />}
    </div>
  );
}
