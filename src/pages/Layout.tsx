import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { storage } from "@/lib/storage";

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
    { path: '/', icon: 'grid_view', label: 'Focus' },
    { path: '/tasks', icon: 'checklist', label: 'Tasks' },
    // FAB goes here (center) - handles Blocker action
    { path: '/stats', icon: 'bar_chart', label: 'Stats' },
    { path: '/settings', icon: 'person', label: 'More' },
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <div className="app-container bg-background min-h-screen">
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Premium Bottom Navigation - Focus First Design */}
      {!hideNav && (
        <nav className="fixed bottom-0 left-0 right-0 max-w-[430px] mx-auto z-50">
          {/* Gradient fade background */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/95 to-transparent pointer-events-none" style={{ height: '120%', top: '-20%' }} />
          
          {/* Navigation bar */}
          <div className="relative bg-card border-t border-border/30 px-6 py-3 flex justify-between items-center">
            {/* Left nav items */}
            {navItems.slice(0, 2).map((item) => (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center gap-1.5 min-w-[56px] transition-all duration-300 ${
                  isActive(item.path) ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className={`p-2 rounded-xl transition-all duration-300 ${
                  isActive(item.path) 
                    ? 'bg-primary/15' 
                    : ''
                }`}
                style={isActive(item.path) ? { boxShadow: '0 0 20px hsl(var(--primary) / 0.3)' } : {}}
                >
                  <span 
                    className={`material-symbols-outlined text-xl transition-transform duration-200 ${
                      isActive(item.path) ? 'scale-110' : ''
                    }`}
                    style={isActive(item.path) ? { fontVariationSettings: "'FILL' 1, 'wght' 400" } : {}}
                  >
                    {item.icon}
                  </span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-tight">{item.label}</span>
              </button>
            ))}

            {/* Center Floating Focus Button - THE PRIMARY ACTION */}
            <div className="relative -top-7">
              <button 
                onClick={handleStartFocus}
                className="relative flex size-14 items-center justify-center rounded-2xl text-white transition-all hover:scale-105 press-effect"
                style={{ 
                  background: focusModeActive 
                    ? 'var(--gradient-accent)' 
                    : 'var(--gradient-primary)',
                  boxShadow: focusModeActive 
                    ? '0 8px 32px hsla(38, 92%, 50%, 0.5), 0 0 40px hsla(38, 92%, 50%, 0.3)'
                    : '0 8px 32px hsla(258, 85%, 65%, 0.4), 0 4px 12px hsla(258, 85%, 65%, 0.3)'
                }}
              >
                <span 
                  className="material-symbols-outlined text-2xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {focusModeActive ? 'timer' : 'shield'}
                </span>
                {/* Active session indicator */}
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
                className={`flex flex-col items-center gap-1.5 min-w-[56px] transition-all duration-300 ${
                  isActive(item.path) ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <div className={`p-2 rounded-xl transition-all duration-300 ${
                  isActive(item.path) 
                    ? 'bg-primary/15' 
                    : ''
                }`}
                style={isActive(item.path) ? { boxShadow: '0 0 20px hsl(var(--primary) / 0.3)' } : {}}
                >
                  <span 
                    className={`material-symbols-outlined text-xl transition-transform duration-200 ${
                      isActive(item.path) ? 'scale-110' : ''
                    }`}
                    style={isActive(item.path) ? { fontVariationSettings: "'FILL' 1, 'wght' 400" } : {}}
                  >
                    {item.icon}
                  </span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-tight">{item.label}</span>
              </button>
            ))}
          </div>
        </nav>
      )}

      {/* Bottom Safe Area Spacer */}
      {!hideNav && <div className="h-24" />}
    </div>
  );
}
