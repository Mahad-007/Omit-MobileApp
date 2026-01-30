import { NavLink as RouterNavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Shield, ListTodo, Settings, Timer } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { storage } from "@/lib/storage";

const navigation = [
  { name: "Focus", href: "/", icon: LayoutDashboard },
  { name: "Blocker", href: "/blocker", icon: Shield },
  { name: "Tasks", href: "/tasks", icon: ListTodo },
  { name: "More", href: "/settings", icon: Settings },
];

export function MobileNav() {
  const navigate = useNavigate();
  const [focusModeActive, setFocusModeActive] = useState(false);

  useEffect(() => {
    const checkSession = () => {
      const session = storage.getActiveSession();
      setFocusModeActive(!!session);
    };
    
    checkSession();
    
    // Listen for storage changes
    const unsubscribe = storage.onChange('all', checkSession);
    window.addEventListener('storage', checkSession);
    
    return () => {
      unsubscribe();
      window.removeEventListener('storage', checkSession);
    };
  }, []);

  const handleStartFocus = () => {
    if (focusModeActive) {
      // If session active, go to timer
      navigate('/timer');
    } else {
      // If no session, go to blocker to configure and start
      navigate('/blocker');
    }
  };

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 glass-premium safe-area-bottom">
      <div className="flex items-center justify-between px-8 py-3">
        {/* Left nav items */}
        {navigation.slice(0, 2).map((item) => (
          <RouterNavLink
            key={item.name}
            to={item.href}
            end={item.href === "/"}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-1 transition-all duration-300 min-w-[48px] relative",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )
            }
          >
            {({ isActive }) => (
              <>
                <div className={cn(
                  "p-1.5 rounded-lg transition-all duration-300",
                  isActive && "bg-primary/15 shadow-[0_0_12px_hsl(var(--primary)/0.4)]"
                )}>
                  <item.icon className={cn(
                    "w-5 h-5 transition-transform duration-200",
                    isActive && "scale-110"
                  )} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-tighter">{item.name}</span>
              </>
            )}
          </RouterNavLink>
        ))}
        
        {/* Center floating button - Start Focus / View Timer */}
        <div className="relative -top-6">
          <button
            onClick={handleStartFocus}
            className={cn(
              "flex size-14 items-center justify-center rounded-full text-white shadow-xl hover:scale-105 press-effect transition-all",
              focusModeActive 
                ? "bg-highlight animate-glow-pulse" 
                : "bg-primary animate-subtle-pulse hover:animate-none"
            )}
            style={{ 
              background: focusModeActive 
                ? 'var(--gradient-accent)' 
                : 'var(--gradient-primary)',
              boxShadow: focusModeActive 
                ? '0 0 30px hsla(38, 92%, 50%, 0.5)' 
                : 'var(--shadow-glow-lg)'
            }}
          >
            {focusModeActive ? (
              <Timer className="w-7 h-7" strokeWidth={2} />
            ) : (
              <Shield className="w-7 h-7" strokeWidth={2} />
            )}
          </button>
          {/* Active session indicator dot */}
          {focusModeActive && (
            <div className="absolute -top-1 -right-1 size-4 rounded-full bg-highlight border-2 border-background animate-subtle-pulse" />
          )}
        </div>
        
        {/* Right nav items */}
        {navigation.slice(2, 4).map((item) => (
          <RouterNavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-1 transition-all duration-300 min-w-[48px] relative",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )
            }
          >
            {({ isActive }) => (
              <>
                <div className={cn(
                  "p-1.5 rounded-lg transition-all duration-300",
                  isActive && "bg-primary/15 shadow-[0_0_12px_hsl(var(--primary)/0.4)]"
                )}>
                  <item.icon className={cn(
                    "w-5 h-5 transition-transform duration-200",
                    isActive && "scale-110"
                  )} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-tighter">{item.name}</span>
              </>
            )}
          </RouterNavLink>
        ))}
      </div>
    </nav>
  );
}
