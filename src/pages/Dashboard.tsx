import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { storage, Task, Settings } from "@/lib/storage";
import { useAuth } from "@/contexts/AuthContext";
import { Switch } from "@/components/ui/switch";

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [focusHours, setFocusHours] = useState(0);
  const [focusModeActive, setFocusModeActive] = useState(false);
  const [settings, setSettings] = useState<Settings>(storage.getSettings());
  const [dailyUsage, setDailyUsage] = useState(0);

  useEffect(() => {
    const loadData = () => {
      setTasks(storage.getTasks());
      setFocusHours(storage.getSavedTime());
      setSettings(storage.getSettings());
      setDailyUsage(storage.getDailyAppUsage());
      
      const session = storage.getActiveSession();
      if (session) {
        setFocusModeActive(true);
      } else {
        setFocusModeActive(false);
      }
    };
    loadData();

    const unsubscribeTasks = storage.onChange('tasks', loadData);
    const unsubscribeStats = storage.onChange('stats', loadData);
    const unsubscribeSettings = storage.onChange('settings', loadData);
    const unsubscribeAll = storage.onChange('all', loadData);
    
    const handleStorageChange = () => loadData();
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      unsubscribeTasks();
      unsubscribeStats();
      unsubscribeSettings();
      unsubscribeAll();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const remainingTasks = tasks.filter(t => !t.completed).length;
  const completedTasks = tasks.filter(t => t.completed).length;
  const totalTasks = tasks.length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const now = new Date();
  const options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'short', day: 'numeric' };
  const dateStr = now.toLocaleDateString('en-US', options);
  
  const hour = now.getHours();
  let greeting = 'Good morning';
  let greetingIcon = 'light_mode';
  if (hour >= 12 && hour < 17) {
    greeting = 'Good afternoon';
    greetingIcon = 'wb_sunny';
  } else if (hour >= 17) {
    greeting = 'Good evening';
    greetingIcon = 'dark_mode';
  }

  const userName = user?.email?.split('@')[0] || 'there';
  const displayName = userName.charAt(0).toUpperCase() + userName.slice(1);

  const priorityTask = tasks.find(t => !t.completed && t.priority === 'high') || 
                       tasks.find(t => !t.completed);

  const remainingTime = settings.dailyTimeLimitEnabled 
    ? Math.max(0, settings.dailyTimeLimitMinutes - dailyUsage)
    : settings.dailyTimeLimitMinutes;
  const usagePercent = settings.dailyTimeLimitEnabled && settings.dailyTimeLimitMinutes > 0
    ? Math.min(100, Math.round((dailyUsage / settings.dailyTimeLimitMinutes) * 100))
    : 0;

  const handleStartFocus = () => {
    if (focusModeActive) {
      navigate('/timer');
    } else {
      navigate('/blocker');
    }
  };

  const handleTimeLimitToggle = (enabled: boolean) => {
    const newSettings = { ...settings, dailyTimeLimitEnabled: enabled };
    setSettings(newSettings);
    storage.saveSettings(newSettings);
  };

  const handleTimeLimitChange = (minutes: number) => {
    const newSettings = { ...settings, dailyTimeLimitMinutes: minutes };
    setSettings(newSettings);
    storage.saveSettings(newSettings);
  };

  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  };

  return (
    <div className="flex flex-col min-h-screen pb-24 relative">
      {/* Atmospheric Background */}
      <div className="absolute inset-0 bg-mesh opacity-60 pointer-events-none" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-48 left-0 w-64 h-64 bg-highlight/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header Section */}
      <header className="relative flex items-start bg-transparent pt-14 px-6 pb-6 justify-between animate-fade-up">
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
        <button 
          onClick={() => navigate('/settings')}
          className="flex items-center justify-center rounded-2xl h-12 w-12 bg-card/80 text-foreground hover:bg-accent transition-all border border-border/50 hover-lift press-effect backdrop-blur-sm"
        >
          <span className="material-symbols-outlined">settings</span>
        </button>
      </header>

      {/* Stats Overview Cards */}
      <section className="flex gap-4 px-6 mb-6 animate-fade-up stagger-1" style={{ opacity: 0, animationFillMode: 'forwards' }}>
        <div className="flex-1 flex flex-col gap-3 rounded-2xl p-5 border border-border/50 bg-card/60 backdrop-blur-sm zen-card-shadow">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-xl bg-primary/15 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-lg">checklist</span>
            </div>
            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-widest">Tasks Left</p>
          </div>
          <p className="text-foreground text-3xl font-bold">{remainingTasks}</p>
        </div>
        <div className="flex-1 flex flex-col gap-3 rounded-2xl p-5 border border-border/50 bg-card/60 backdrop-blur-sm zen-card-shadow">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-xl bg-highlight/15 flex items-center justify-center">
              <span className="material-symbols-outlined text-highlight text-lg">hourglass_empty</span>
            </div>
            <p className="text-muted-foreground text-xs font-semibold uppercase tracking-widest">Deep Work</p>
          </div>
          <p className="text-foreground text-3xl font-bold">{focusHours.toFixed(1)}<span className="text-lg text-muted-foreground font-medium ml-1">hrs</span></p>
        </div>
      </section>

      {/* Daily Time Limit Card */}
      <section className="px-6 mb-6 animate-fade-up stagger-2" style={{ opacity: 0, animationFillMode: 'forwards' }}>
        <div className="flex flex-col gap-4 rounded-2xl p-5 border border-border/50 bg-card/60 backdrop-blur-sm zen-card-shadow">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-primary/15 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">timer</span>
              </div>
              <div>
                <p className="text-foreground text-base font-bold">Daily App Limit</p>
                <p className="text-muted-foreground text-xs">
                  {settings.dailyTimeLimitEnabled 
                    ? `${formatTime(remainingTime)} remaining`
                    : 'Set a daily usage limit'}
                </p>
              </div>
            </div>
            <Switch 
              checked={settings.dailyTimeLimitEnabled}
              onCheckedChange={handleTimeLimitToggle}
            />
          </div>
          
          {settings.dailyTimeLimitEnabled && (
            <>
              {/* Usage Progress Bar */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <p className="text-muted-foreground text-xs">
                    Used: {formatTime(dailyUsage)} / {formatTime(settings.dailyTimeLimitMinutes)}
                  </p>
                  <p className={`text-xs font-bold ${usagePercent >= 100 ? 'text-destructive' : usagePercent >= 80 ? 'text-warning' : 'text-primary'}`}>
                    {usagePercent}%
                  </p>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-700 ease-out ${
                      usagePercent >= 100 ? 'bg-destructive' : usagePercent >= 80 ? 'bg-warning' : 'bg-gradient-to-r from-primary to-purple-500'
                    }`}
                    style={{ width: `${usagePercent}%` }}
                  />
                </div>
              </div>

              {/* Duration Selector */}
              <div className="flex gap-2">
                {[30, 60, 90, 120].map((mins) => (
                  <button
                    key={mins}
                    onClick={() => handleTimeLimitChange(mins)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      settings.dailyTimeLimitMinutes === mins 
                        ? 'bg-primary text-white shadow-lg' 
                        : 'bg-muted text-muted-foreground hover:bg-accent'
                    }`}
                  >
                    {formatTime(mins)}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* Primary Focus Card */}
      <main className="px-6 mb-8 animate-fade-up stagger-3" style={{ opacity: 0, animationFillMode: 'forwards' }}>
        <div className="relative flex flex-col items-stretch rounded-2xl overflow-hidden bg-card zen-card-shadow glow-border group">
          {/* Gradient Hero */}
          <div 
            className="w-full h-44 bg-center bg-no-repeat bg-cover relative"
            style={{
              background: 'linear-gradient(135deg, hsl(258 85% 35%) 0%, hsl(280 75% 30%) 40%, hsl(240 50% 25%) 100%)'
            }}
          >
            {/* Mesh overlay */}
            <div className="absolute inset-0 bg-aurora opacity-40" />
            {/* Bottom fade */}
            <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
            
            {/* Status Badge */}
            <div className="absolute top-4 left-4">
              <span className={`px-3 py-1.5 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-widest ${
                focusModeActive 
                  ? 'bg-highlight/90 text-white' 
                  : 'bg-white/20 text-white border border-white/20'
              }`}>
                {focusModeActive ? '● In Progress' : 'Priority Task'}
              </span>
            </div>
          </div>
          
          {/* Content */}
          <div className="flex w-full flex-col gap-3 p-6">
            <p className="text-primary text-xs font-bold tracking-widest uppercase">Primary Focus</p>
            <h3 className="text-foreground text-2xl font-bold leading-tight tracking-tight">
              {priorityTask?.title || 'No tasks yet'}
            </h3>
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="material-symbols-outlined text-sm">schedule</span>
                <span className="text-sm font-medium">
                  {focusModeActive ? 'Session active' : '25 min session'}
                </span>
              </div>
              <button 
                onClick={() => navigate('/tasks')}
                className="flex items-center justify-center rounded-xl h-9 px-4 bg-primary/15 text-primary border border-primary/20 text-sm font-bold press-effect hover:bg-primary/25 transition-all"
              >
                <span>View Tasks</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Daily Progress Section */}
      <section className="px-6 mb-10 animate-fade-up stagger-4" style={{ opacity: 0, animationFillMode: 'forwards' }}>
        <div className="flex flex-col gap-4 p-5 rounded-2xl border border-border/50 bg-card/40 backdrop-blur-sm">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-lg">trending_up</span>
              <p className="text-foreground text-sm font-semibold">Daily Progress</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold gradient-text">{progressPercent}%</span>
            </div>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div 
              className="h-full rounded-full bg-gradient-to-r from-primary via-purple-500 to-primary transition-all duration-700 ease-out" 
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="text-muted-foreground text-xs">
            {progressPercent >= 100 ? '🎉 All tasks completed! Great work!' : 
             progressPercent >= 75 ? '🔥 Almost there! Keep pushing!' :
             progressPercent >= 50 ? '💪 Halfway through your day!' : 
             progressPercent > 0 ? '🚀 Great start! Keep the momentum!' :
             '✨ Ready to start your productive day?'}
          </p>
        </div>
      </section>

      {/* Start Focus CTA */}
      <section className="flex px-6 pb-6 justify-center animate-fade-up stagger-5" style={{ opacity: 0, animationFillMode: 'forwards' }}>
        <button 
          onClick={handleStartFocus}
          className="group relative flex min-w-[220px] items-center justify-center rounded-2xl h-16 px-10 text-white gap-3 text-lg font-bold tracking-tight press-effect transition-all overflow-hidden"
          style={{ background: 'var(--gradient-primary)' }}
        >
          {/* Glow effect */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" 
               style={{ boxShadow: 'inset 0 0 40px rgba(255,255,255,0.2)' }} />
          
          <span className="material-symbols-outlined text-2xl group-hover:scale-110 transition-transform" style={{ fontVariationSettings: "'FILL' 1" }}>
            {focusModeActive ? 'timer' : 'play_arrow'}
          </span>
          <span>{focusModeActive ? 'View Timer' : 'Start Focus'}</span>
        </button>
      </section>
    </div>
  );
}
