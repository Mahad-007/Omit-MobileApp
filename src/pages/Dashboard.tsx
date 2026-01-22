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
    // Load initial data
    const loadData = () => {
      setTasks(storage.getTasks());
      setFocusHours(storage.getSavedTime());
      setSettings(storage.getSettings());
      setDailyUsage(storage.getDailyAppUsage());
      
      // Check for active focus session
      const session = storage.getActiveSession();
      if (session) {
        setFocusModeActive(true);
      } else {
        setFocusModeActive(false);
      }
    };
    loadData();

    // Subscribe to storage changes for real-time updates
    const unsubscribeTasks = storage.onChange('tasks', loadData);
    const unsubscribeStats = storage.onChange('stats', loadData);
    const unsubscribeSettings = storage.onChange('settings', loadData);
    const unsubscribeAll = storage.onChange('all', loadData);
    
    // Also listen for cross-tab storage changes
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

  // Get current date
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const dateStr = now.toLocaleDateString('en-US', options);
  
  // Get greeting based on time
  const hour = now.getHours();
  let greeting = 'Good morning';
  if (hour >= 12 && hour < 17) greeting = 'Good afternoon';
  else if (hour >= 17) greeting = 'Good evening';

  // Get user's first name
  const userName = user?.email?.split('@')[0] || 'there';
  const displayName = userName.charAt(0).toUpperCase() + userName.slice(1);

  // Get priority task
  const priorityTask = tasks.find(t => !t.completed && t.priority === 'high') || 
                       tasks.find(t => !t.completed);

  // Daily time limit calculations
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
    <div className="flex flex-col min-h-screen pb-24">
      {/* Header Section */}
      <header className="flex items-center bg-transparent pt-12 px-6 pb-8 justify-between animate-fade-up">
        <div className="flex flex-col gap-1">
          <p className="text-primary font-semibold text-xs tracking-[0.2em] uppercase">
            Today • {dateStr}
          </p>
          <h2 className="text-foreground text-3xl font-bold leading-tight tracking-tight">
            {greeting}, {displayName}
          </h2>
        </div>
        <div className="flex size-12 items-center justify-end">
          <button 
            onClick={() => navigate('/settings')}
            className="flex items-center justify-center rounded-full h-12 w-12 bg-card text-foreground hover:bg-primary/20 transition-all border border-border hover-lift press-effect"
          >
            <span className="material-symbols-outlined">settings</span>
          </button>
        </div>
      </header>

      {/* Stats Overview */}
      <section className="flex gap-4 px-6 mb-8 animate-fade-up stagger-1" style={{ opacity: 0, animationFillMode: 'forwards' }}>
        <div className="flex-1 flex flex-col gap-2 rounded-xl p-5 border border-border bg-card/40 zen-card-shadow">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-sm">checklist</span>
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Remaining</p>
          </div>
          <p className="text-foreground text-2xl font-bold">{remainingTasks}</p>
        </div>
        <div className="flex-1 flex flex-col gap-2 rounded-xl p-5 border border-border bg-card/40 zen-card-shadow">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-sm">hourglass_empty</span>
            <p className="text-muted-foreground text-xs font-medium uppercase tracking-wider">Deep Work</p>
          </div>
          <p className="text-foreground text-2xl font-bold">{focusHours.toFixed(1)}h</p>
        </div>
      </section>

      {/* Daily Time Limit Card */}
      <section className="px-6 mb-8 animate-fade-up stagger-2" style={{ opacity: 0, animationFillMode: 'forwards' }}>
        <div className="flex flex-col gap-4 rounded-xl p-5 border border-border bg-card/40 zen-card-shadow">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-primary">timer</span>
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
                  <p className={`text-xs font-semibold ${usagePercent >= 100 ? 'text-destructive' : usagePercent >= 80 ? 'text-warning' : 'text-primary'}`}>
                    {usagePercent}%
                  </p>
                </div>
                <div className="h-2 w-full rounded-full bg-border overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      usagePercent >= 100 ? 'bg-destructive' : usagePercent >= 80 ? 'bg-warning' : 'bg-primary'
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
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                      settings.dailyTimeLimitMinutes === mins 
                        ? 'bg-primary text-white' 
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
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
      <main className="px-6 mb-10 animate-fade-up stagger-3" style={{ opacity: 0, animationFillMode: 'forwards' }}>
        <div className="flex flex-col items-stretch justify-start rounded-xl overflow-hidden bg-card zen-card-shadow glow-border hover-lift">
          <div 
            className="w-full h-48 bg-center bg-no-repeat bg-cover relative bg-aurora"
            style={{
              backgroundImage: 'linear-gradient(135deg, hsl(200 35% 25%) 0%, hsl(280 40% 30%) 50%, hsl(208 30% 35%) 100%)'
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent"></div>
            <div className="absolute top-4 left-4">
              <span className="px-3 py-1 bg-primary/80 backdrop-blur-md rounded-full text-[10px] font-bold text-white uppercase tracking-widest">
                {focusModeActive ? 'In Progress' : 'Priority One'}
              </span>
            </div>
          </div>
          <div className="flex w-full flex-col gap-2 p-6">
            <p className="text-muted-foreground text-xs font-semibold tracking-widest uppercase">Primary Focus</p>
            <h3 className="text-foreground text-2xl font-bold leading-tight tracking-tight">
              {priorityTask?.title || 'No tasks yet'}
            </h3>
            <div className="flex items-center justify-between mt-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="material-symbols-outlined text-sm">schedule</span>
                <span className="text-sm font-medium">
                  {focusModeActive ? 'Session active' : '25 min session'}
                </span>
              </div>
              <button 
                onClick={() => navigate('/tasks')}
                className="flex items-center justify-center rounded-lg h-9 px-4 bg-primary/20 text-primary border border-primary/30 text-sm font-bold press-effect hover:bg-primary/30 transition-all"
              >
                <span>Details</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Progress Section */}
      <section className="px-6 mb-12 animate-fade-up stagger-4" style={{ opacity: 0, animationFillMode: 'forwards' }}>
        <div className="flex flex-col gap-3 p-6 rounded-xl border border-border/50 bg-card/20">
          <div className="flex justify-between items-end">
            <p className="text-foreground text-sm font-medium">Daily Progress</p>
            <p className="text-primary text-lg font-bold">{progressPercent}%</p>
          </div>
          <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
            <div 
              className="h-full rounded-full bg-primary transition-all duration-500" 
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
          <p className="text-muted-foreground text-xs italic">
            {progressPercent >= 100 ? 'All tasks completed!' : 
             progressPercent >= 50 ? 'Almost at your daily goal' : 
             'Keep pushing forward'}
          </p>
        </div>
      </section>

      {/* Centered Action Button */}
      <section className="flex px-6 pb-20 justify-center animate-fade-up stagger-5" style={{ opacity: 0, animationFillMode: 'forwards' }}>
        <button 
          onClick={handleStartFocus}
          className="group flex min-w-[200px] items-center justify-center rounded-full h-16 px-8 bg-primary text-white gap-3 text-lg font-bold tracking-tight soft-glow press-effect hover:brightness-110 transition-all animate-glow-pulse"
        >
          <span className="material-symbols-outlined fill-current group-hover:scale-110 transition-transform">
            {focusModeActive ? 'timer' : 'play_arrow'}
          </span>
          <span>{focusModeActive ? 'View Timer' : 'Start Focus'}</span>
        </button>
      </section>
    </div>
  );
}

