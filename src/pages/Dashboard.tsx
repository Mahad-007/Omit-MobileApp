import { useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { storage, Settings } from "@/lib/storage";
import { useAuth } from "@/contexts/AuthContext";
import { useTasks, useBlockedApps } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// App icons mapping
const appIcons: Record<string, { icon: string; color: string }> = {
  'instagram.com': { icon: 'photo_camera', color: 'bg-gradient-to-br from-purple-500 to-pink-500' },
  'tiktok.com': { icon: 'music_note', color: 'bg-gradient-to-br from-cyan-400 to-pink-500' },
  'twitter.com': { icon: 'alternate_email', color: 'bg-sky-500' },
  'facebook.com': { icon: 'people', color: 'bg-blue-600' },
  'youtube.com': { icon: 'play_circle', color: 'bg-red-500' },
  'netflix.com': { icon: 'movie', color: 'bg-red-600' },
  'twitch.tv': { icon: 'videogame_asset', color: 'bg-purple-600' },
  'reddit.com': { icon: 'forum', color: 'bg-orange-500' },
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Data from React Query
  const { data: tasks = [] } = useTasks();
  const { data: blockedApps = [], toggle } = useBlockedApps();
  
  const [focusHours, setFocusHours] = useState(0);
  const [focusModeActive, setFocusModeActive] = useState(false);
  const [settings, setSettings] = useState<Settings>(storage.getSettings());
  const [dailyUsage, setDailyUsage] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [totalSessionTime, setTotalSessionTime] = useState(0);

  const loadLocalData = useCallback(() => {
    // Settings & Stats still local for now - explicitly separate concerns
    setFocusHours(storage.getSavedTime());
    setSettings(storage.getSettings());
    setDailyUsage(storage.getDailyAppUsage());
    
    const session = storage.getActiveSession();
    if (session) {
      setFocusModeActive(true);
      const remaining = Math.max(0, session.endTime - Date.now());
      setTimeRemaining(Math.floor(remaining / 1000));
      setTotalSessionTime(session.duration * 60);
    } else {
      setFocusModeActive(false);
      setTimeRemaining(0);
      setTotalSessionTime(0);
    }
  }, []);

  useEffect(() => {
    loadLocalData();

    // Only subscribe to settings/stats changes from storage
    const unsubscribeStats = storage.onChange('stats', loadLocalData);
    const unsubscribeSettings = storage.onChange('settings', loadLocalData);
    
    // Timer countdown when session is active
    const interval = setInterval(() => {
      const session = storage.getActiveSession();
      if (session) {
        const remaining = Math.max(0, session.endTime - Date.now());
        setTimeRemaining(Math.floor(remaining / 1000));
        if (remaining <= 0) {
          loadLocalData();
        }
      }
    }, 1000);
    
    return () => {
      unsubscribeStats();
      unsubscribeSettings();
      clearInterval(interval);
    };
  }, [loadLocalData]);

  const toggleApp = async (id: string) => {
    const app = blockedApps.find(a => a.id === id);
    if (!app) return;
    try {
      await toggle.mutateAsync({ id, blocked: !app.isEnabled });
    } catch (error) {
      toast.error("Failed to toggle app");
    }
  };
  
  // Logic for greeting and date
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const greetingIcon = hour < 12 ? 'wb_sunny' : hour < 18 ? 'wb_twilight' : 'dark_mode';
  
  const dateStr = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  });

  const userName = user?.email?.split('@')[0] || 'User';
  const displayName = userName.charAt(0).toUpperCase() + userName.slice(1);

  // Logic for tasks
  const enabledApps = blockedApps.filter(a => a.isEnabled); // Used in JSX
  const incompleteTasks = tasks.filter(t => !t.completed);
  const priorityTask = incompleteTasks.find(t => t.priority === 'high') || incompleteTasks[0];
  const remainingTasks = incompleteTasks.length;
  const completedTasks = tasks.length - remainingTasks;
  const totalTasks = tasks.length;

  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const sessionProgress = totalSessionTime > 0 ? Math.min(100, Math.max(0, ((totalSessionTime - timeRemaining) / totalSessionTime) * 100)) : 0;
  
  const handleStartFocus = () => {
    if (focusModeActive) {
      navigate('/timer');
    } else {
      navigate('/blocker'); // Or wherever start flow is
    }
  };

  return (
    <div className="flex flex-col min-h-screen pb-24 relative">
      {/* Atmospheric Background */}
      <div className="absolute inset-0 bg-mesh opacity-60 pointer-events-none" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-48 left-0 w-64 h-64 bg-highlight/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header Section */}
      <header className="relative flex items-start bg-transparent pt-14 px-6 pb-4 justify-between animate-fade-up">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-primary">
            <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>
              {greetingIcon}
            </span>
            <p className="font-semibold text-xs tracking-widest uppercase">
              {dateStr}
            </p>
          </div>
          <h1 className="text-foreground text-3xl font-bold leading-tight tracking-tight">
            {greeting},
            <br />
            <span className="gradient-text">{displayName}</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {/* Focus Status Badge */}
          {focusModeActive && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-highlight/20 border border-highlight/30">
              <div className="size-2 rounded-full bg-highlight animate-subtle-pulse" />
              <span className="text-highlight text-[10px] font-bold uppercase tracking-wider">Focusing</span>
            </div>
          )}
          <button 
            onClick={() => navigate('/settings')}
            className="flex items-center justify-center rounded-2xl h-12 w-12 bg-card text-foreground hover:bg-accent transition-all border border-border/50 hover-lift press-effect"
          >
            <span className="material-symbols-outlined">settings</span>
          </button>
        </div>
      </header>

      {/* ===== FOCUS STATUS HERO CARD ===== */}
      <section className="px-6 mb-6 animate-fade-up stagger-1">
        <div 
          className={cn(
            "relative overflow-hidden rounded-3xl p-6 border transition-all",
            focusModeActive 
              ? "bg-gradient-to-br from-highlight/20 via-card to-card border-highlight/30" 
              : "bg-gradient-to-br from-primary/20 via-card to-card border-primary/30 glow-border"
          )}
        >
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="relative z-10 flex flex-col items-center text-center gap-4">
            {/* Shield/Timer Icon */}
            <div className={cn(
              "size-20 rounded-3xl flex items-center justify-center transition-all",
              focusModeActive 
                ? "bg-highlight/20 shadow-[0_0_40px_hsla(38,92%,50%,0.3)]" 
                : "bg-primary/20 shadow-[0_0_40px_hsla(258,85%,65%,0.3)]"
            )}>
              <span 
                className={cn(
                  "material-symbols-outlined text-4xl",
                  focusModeActive ? "text-highlight" : "text-primary"
                )}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {focusModeActive ? 'timer' : 'shield'}
              </span>
            </div>

            {/* Status Text */}
            {focusModeActive ? (
              <>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-5xl font-bold tracking-tight focus-timer-display text-foreground">
                    {formatTime(timeRemaining)}
                  </span>
                  <span className="text-muted-foreground text-sm font-medium">remaining in session</span>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full max-w-xs">
                  <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-1000 ease-out bg-gradient-to-r from-highlight to-orange-400" 
                      style={{ width: `${sessionProgress}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                    <span>{enabledApps.length} apps blocked</span>
                    <span>{sessionProgress}% complete</span>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-col items-center gap-1">
                  <h2 className="text-2xl font-bold text-foreground">Ready to Focus</h2>
                  <p className="text-muted-foreground text-sm">
                    {enabledApps.length > 0 
                      ? `${enabledApps.length} apps ready to block` 
                      : 'Configure apps to block'}
                  </p>
                </div>
              </>
            )}

            {/* CTA Button */}
            <button 
              onClick={handleStartFocus}
              className={cn(
                "flex items-center justify-center gap-2 rounded-2xl h-14 px-8 text-white font-bold text-base press-effect transition-all",
                focusModeActive ? "mt-2" : "mt-4"
              )}
              style={{ 
                background: focusModeActive ? 'var(--gradient-accent)' : 'var(--gradient-primary)',
                boxShadow: focusModeActive ? '0 0 30px hsla(38, 92%, 50%, 0.4)' : 'var(--shadow-glow-lg)'
              }}
            >
              <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                {focusModeActive ? 'visibility' : 'play_arrow'}
              </span>
              <span>{focusModeActive ? 'View Session' : 'Start Focus Session'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* ===== BLOCKED APPS QUICK ACCESS ===== */}
      <section className="px-6 mb-6 animate-fade-up stagger-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-lg">block</span>
            <h3 className="text-foreground text-sm font-bold">Blocked Apps</h3>
          </div>
          <button 
            onClick={() => navigate('/blocker')}
            className="text-primary text-xs font-semibold hover:underline"
          >
            Manage All →
          </button>
        </div>
        
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
          {blockedApps.slice(0, 5).map((app) => {
            const iconData = appIcons[app.url] || { icon: 'block', color: 'bg-muted' };
            return (
              <button
                key={app.id}
                onClick={() => toggleApp(app.id)}
                className={cn(
                  "flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all min-w-[72px] press-effect",
                  app.isEnabled 
                    ? "bg-primary/10 border-primary/30" 
                    : "bg-card/60 border-border/50 opacity-60"
                )}
              >
                <div className={cn(
                  "size-12 rounded-xl flex items-center justify-center shadow-lg relative",
                  iconData.color
                )}>
                  <span className="material-symbols-outlined text-white text-xl">
                    {iconData.icon}
                  </span>
                  {app.isEnabled && (
                    <div className="absolute -top-1 -right-1 size-4 rounded-full bg-primary flex items-center justify-center">
                      <span className="material-symbols-outlined text-white text-[10px]">check</span>
                    </div>
                  )}
                </div>
                <span className="text-[10px] font-semibold text-foreground/80 truncate max-w-[60px]">
                  {app.name}
                </span>
              </button>
            );
          })}
          
          {/* Add More Button */}
          <button
            onClick={() => navigate('/blocker')}
            className="flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border border-dashed border-border/50 bg-card/30 min-w-[72px] hover:bg-card/60 transition-all"
          >
            <div className="size-12 rounded-xl bg-muted/50 flex items-center justify-center">
              <span className="material-symbols-outlined text-muted-foreground text-xl">add</span>
            </div>
            <span className="text-[10px] font-semibold text-muted-foreground">Add</span>
          </button>
        </div>
      </section>

      {/* ===== FOCUS STATS OVERVIEW ===== */}
      <section className="flex gap-4 px-6 mb-6 animate-fade-up stagger-3">
        <div className="flex-1 flex flex-col gap-3 rounded-2xl p-5 border border-border/50 bg-card zen-card-shadow">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-xl bg-primary/15 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-lg">hourglass_empty</span>
            </div>
            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-widest">Focus Time</p>
          </div>
          <p className="text-foreground text-3xl font-bold">{focusHours.toFixed(1)}<span className="text-lg text-muted-foreground font-medium ml-1">hrs</span></p>
        </div>
        <div className="flex-1 flex flex-col gap-3 rounded-2xl p-5 border border-border/50 bg-card zen-card-shadow">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-xl bg-highlight/15 flex items-center justify-center">
              <span className="material-symbols-outlined text-highlight text-lg">shield</span>
            </div>
            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-widest">Protected</p>
          </div>
          <p className="text-foreground text-3xl font-bold">{enabledApps.length}<span className="text-lg text-muted-foreground font-medium ml-1">apps</span></p>
        </div>
      </section>

      {/* ===== CURRENT TASK (Secondary) ===== */}
      {priorityTask && (
        <section className="px-6 mb-6 animate-fade-up stagger-4">
          <div className="flex items-center justify-between p-4 rounded-2xl border border-border/50 bg-card">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="size-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-primary">task_alt</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Current Task</p>
                <p className="text-foreground text-sm font-semibold truncate">{priorityTask.title}</p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/tasks')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-all shrink-0"
            >
              <span>{remainingTasks} left</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>
        </section>
      )}

      {/* ===== DAILY PROGRESS (Tertiary) ===== */}
      <section className="px-6 mb-10 animate-fade-up stagger-5">
        <div className="flex flex-col gap-3 p-4 rounded-2xl border border-border/30 bg-card">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-muted-foreground text-base">trending_up</span>
              <p className="text-muted-foreground text-xs font-semibold">Task Progress</p>
            </div>
            <span className="text-sm font-bold text-foreground/60">{completedTasks}/{totalTasks}</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div 
              className="h-full rounded-full bg-gradient-to-r from-primary/60 via-purple-500/60 to-primary/60 transition-all duration-700 ease-out" 
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </section>
    </div>
  );
}
