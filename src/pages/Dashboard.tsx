import { useNavigate } from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import { storage, Settings } from "@/lib/storage";
import { useAuth } from "@/contexts/AuthContext";
import { useTasks, useBlockedApps } from "@/lib/api";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import AppBlocker, { isCapacitor, AppInfo, PermissionStatus } from "@/lib/app-blocker";
import QuickAddTaskModal from "@/components/QuickAddTaskModal";
import { Task } from "@/lib/storage";

interface InstalledAppWithStatus extends AppInfo {
  blockMode: 'off' | 'session' | 'persistent';
}

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
  const { data: tasks = [], createTask } = useTasks();
  const { data: blockedApps = [], toggle } = useBlockedApps();
  
  const [showAddModal, setShowAddModal] = useState(false);
  
  const [focusHours, setFocusHours] = useState(0);
  const [focusModeActive, setFocusModeActive] = useState(false);
  const [settings, setSettings] = useState<Settings>(storage.getSettings());
  const [dailyUsage, setDailyUsage] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [totalSessionTime, setTotalSessionTime] = useState(0);
  const [permissions, setPermissions] = useState<PermissionStatus | null>(null);
  const [installedApps, setInstalledApps] = useState<InstalledAppWithStatus[]>([]);

  const onAndroid = isCapacitor();

  // Check permissions on Android
  const checkPermissions = async () => {
    if (onAndroid) {
      try {
        const status = await AppBlocker.checkPermissions();
        setPermissions(status);
      } catch (error) {
        console.error("Failed to check permissions:", error);
      }
    }
  };

  // Load installed apps from the device
  const loadInstalledApps = async () => {
    if (!onAndroid) return;
    try {
      const { apps } = await AppBlocker.getInstalledApps();
      const sessionApps = storage.getAndroidSessionApps();
      const persistentApps = storage.getAndroidPersistentApps();
      
      const appsWithStatus = apps.map((app: AppInfo) => {
        let mode: 'off' | 'session' | 'persistent' = 'off';
        if (persistentApps.includes(app.packageName)) mode = 'persistent';
        else if (sessionApps.includes(app.packageName)) mode = 'session';
        
        return {
          ...app,
          blockMode: mode
        };
      });
      
      // Sort: blocked apps first (persistent then session), then alphabetically
      appsWithStatus.sort((a: InstalledAppWithStatus, b: InstalledAppWithStatus) => {
        const scoreA = a.blockMode === 'persistent' ? 2 : (a.blockMode === 'session' ? 1 : 0);
        const scoreB = b.blockMode === 'persistent' ? 2 : (b.blockMode === 'session' ? 1 : 0);
        
        if (scoreA !== scoreB) return scoreB - scoreA;
        return a.appName.localeCompare(b.appName);
      });
      
      setInstalledApps(appsWithStatus);
    } catch (error) {
      console.error("Failed to load installed apps:", error);
    }
  };

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

    // Check permissions and load installed apps on Android
    if (onAndroid) {
      checkPermissions();
      loadInstalledApps();
    }

    // Only subscribe to settings/stats changes from storage
    const unsubscribeStats = storage.onChange('stats', loadLocalData);
    const unsubscribeSettings = storage.onChange('settings', loadLocalData);
    
    // Subscribe to storage changes for blocked apps to keep quick actions in sync
    const unsubscribeApps = storage.onChange('blockedApps', () => {
      loadInstalledApps();
    });
    
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
      unsubscribeApps();
      clearInterval(interval);
    };
  }, [loadLocalData, onAndroid]);

  const toggleApp = async (id: string) => {
    const app = blockedApps.find(a => a.id === id);
    if (!app) return;
    try {
      await toggle.mutateAsync({ id, blocked: !app.isEnabled });
    } catch (error) {
      toast.error("Failed to toggle app");
    }
  };

  const handleAddTask = async (newTask: Omit<Task, 'id' | 'completed' | 'createdAt'>) => {
    try {
      await createTask.mutateAsync(newTask);
      toast.success("Task added");
    } catch (error) {
      toast.error("Failed to create task");
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
      <header className="relative flex items-center bg-transparent pt-14 px-6 pb-6 justify-between animate-fade-up z-10">
        <div className="flex flex-col">
          <p className="text-primary font-bold text-xs uppercase tracking-widest mb-1 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">{greetingIcon}</span>
            {dateStr}
          </p>
          <h1 className="text-foreground text-3xl font-bold tracking-tight">
            {greeting}, <span className="gradient-text">{displayName}</span>
          </h1>
        </div>
        
        <div className="flex items-center gap-3">
           {focusModeActive && (
             <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-highlight/10 border border-highlight/20 animate-fade-in">
               <div className="size-2 rounded-full bg-highlight animate-subtle-pulse" />
               <span className="text-highlight text-[10px] font-bold uppercase tracking-wider">Focus Active</span>
             </div>
           )}
           <button 
             onClick={() => navigate('/settings')}
             className="touch-target-44 rounded-2xl bg-card/50 text-foreground hover:bg-card transition-all border border-border/50 hover-lift active:scale-95"
             aria-label="Settings"
           >
             <span className="material-symbols-outlined">settings</span>
           </button>
        </div>
      </header>

      {/* ===== FOCUS STATUS HERO CARD ===== */}
      <section className="px-6 mb-8 animate-fade-up stagger-1 z-10 relative">
        <div 
          className={cn(
            "relative overflow-hidden rounded-[2rem] p-6 border transition-all duration-500",
            focusModeActive 
              ? "bg-gradient-to-br from-highlight/10 via-card to-card border-highlight/30 shadow-glow" 
              : "bg-gradient-to-br from-primary/10 via-card to-card border-primary/20 shadow-lg"
          )}
        >
          <div className="relative z-10 flex flex-col items-center text-center gap-6">
            
            {/* Status Display */}
            {focusModeActive ? (
              <div className="flex flex-col items-center gap-2 w-full">
                <div className="flex flex-col items-center">
                    <span className="text-6xl font-light tracking-tighter focus-timer-display text-foreground animate-breathe">
                        {formatTime(timeRemaining)}
                    </span>
                    <span className="text-muted-foreground text-sm font-medium uppercase tracking-widest mt-1">Remaining</span>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full max-w-[240px] mt-4">
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-1000 ease-linear bg-highlight" 
                      style={{ width: `${sessionProgress}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-4">
                 <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
                    <span className="material-symbols-outlined text-3xl text-primary">shield</span>
                 </div>
                 <h2 className="text-2xl font-bold text-foreground">Ready to Focus?</h2>
                 <p className="text-muted-foreground text-sm max-w-[200px] leading-relaxed">
                   {enabledApps.length} apps protected from distractions
                 </p>
              </div>
            )}

            {/* CTA Button */}
            <button 
              onClick={handleStartFocus}
              className={cn(
                "w-full max-w-sm h-14 rounded-2xl text-white font-semibold text-lg hover-lift active:scale-95 flex items-center justify-center gap-2 transition-all",
                focusModeActive ? "bg-highlight shadow-glow" : "bg-primary shadow-lg hover:shadow-primary/25"
              )}
            >
              <span className="material-symbols-outlined text-2xl">
                {focusModeActive ? 'visibility' : 'play_arrow'}
              </span>
              <span>{focusModeActive ? 'View Details' : 'Start Session'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* ===== BLOCKED APPS QUICK ACCESS ===== */}
      {(!onAndroid || (onAndroid && permissions?.allGranted)) && (
        <section className="px-6 mb-8 animate-fade-up stagger-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-foreground text-sm font-bold flex items-center gap-2">
               <span className="material-symbols-outlined text-primary text-lg">apps</span>
               Quick Toggle
            </h3>
            <button 
              onClick={() => navigate('/blocker')}
              className="text-primary text-sm font-medium hover:text-primary/80 transition-colors p-2"
            >
              Manage All
            </button>
          </div>
          
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 -mx-6 px-6">
            {blockedApps.slice(0, 5).map((app) => {
              const iconData = appIcons[app.url] || { icon: 'block', color: 'bg-muted' };
              return (
                <button
                  key={app.id}
                  onClick={() => toggleApp(app.id)}
                  className={cn(
                    "flex flex-col items-center gap-3 min-w-[80px] group transition-all duration-300",
                    app.isEnabled ? "opacity-100" : "opacity-60 grayscale-[0.5]"
                  )}
                >
                  <div className={cn(
                    "size-14 rounded-2xl flex items-center justify-center shadow-sm relative transition-all group-hover:-translate-y-1 group-active:scale-95",
                    iconData.color
                  )}>
                    <span className="material-symbols-outlined text-white text-2xl">
                      {iconData.icon}
                    </span>
                    {app.isEnabled && (
                      <div className="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-background flex items-center justify-center border border-border">
                           <div className="size-3 rounded-full bg-primary" />
                      </div>
                    )}
                  </div>
                  <span className="text-xs font-medium text-foreground/90 truncate max-w-[76px] text-center">
                    {app.name}
                  </span>
                </button>
              );
            })}
            
            {/* Add More Button */}
            <button
              onClick={() => navigate('/blocker')}
              className="flex flex-col items-center gap-3 min-w-[80px] group"
            >
              <div className="size-14 rounded-2xl bg-card border-2 border-dashed border-border flex items-center justify-center group-hover:border-primary/50 group-active:scale-95 transition-all">
                <span className="material-symbols-outlined text-muted-foreground text-2xl">add</span>
              </div>
              <span className="text-xs font-medium text-muted-foreground">Add App</span>
            </button>
          </div>
        </section>
      )}

      {/* ===== STATS ROW ===== */}
      <section className="px-6 mb-8 animate-fade-up stagger-3">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card border border-border/50 rounded-2xl p-5 flex flex-col gap-1 shadow-sm">
                <span className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Focus Time</span>
                <p className="text-3xl font-bold text-foreground">
                    {focusHours.toFixed(1)} <span className="text-sm font-medium text-muted-foreground">h</span>
                </p>
            </div>
            <div className="bg-card border border-border/50 rounded-2xl p-5 flex flex-col gap-1 shadow-sm">
                <span className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Protected</span>
                <p className="text-3xl font-bold text-foreground">
                    {enabledApps.length} <span className="text-sm font-medium text-muted-foreground">apps</span>
                </p>
            </div>
          </div>
      </section>

      {/* ===== CURRENT TASK (Secondary) ===== */}
      <section className="px-6 mb-6 animate-fade-up stagger-4">
        {priorityTask ? (
          <div className="flex items-center justify-between p-4 rounded-2xl border border-border/50 bg-card">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="size-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-primary">task_alt</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Current Task</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-foreground text-sm font-semibold truncate">{priorityTask.title}</p>
                  {priorityTask.dueDate && priorityTask.dueDate.includes('T') && (
                    <span className="text-[10px] text-primary/70 font-bold whitespace-nowrap">
                      {new Date(priorityTask.dueDate).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowAddModal(true)}
                className="size-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-all shrink-0"
                aria-label="Add Task"
              >
                <span className="material-symbols-outlined text-lg">add</span>
              </button>
              <button 
                onClick={() => navigate('/tasks')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-all shrink-0"
              >
                <span>{remainingTasks} left</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </button>
            </div>
          </div>
        ) : (
          <button 
            onClick={() => setShowAddModal(true)}
            className="w-full flex items-center justify-center gap-3 p-6 rounded-[2rem] border-2 border-dashed border-border/40 bg-card/30 hover:bg-card/50 hover:border-primary/30 transition-all group"
          >
            <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined text-primary text-2xl">add_task</span>
            </div>
            <div className="text-left">
              <p className="text-foreground font-bold text-lg">Add your first task</p>
              <p className="text-muted-foreground text-sm">Stay focused and organized</p>
            </div>
          </button>
        )}
      </section>

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

      {/* Quick Add Modal */}
      <QuickAddTaskModal 
        isOpen={showAddModal} 
        onClose={() => setShowAddModal(false)}
        onAddTask={handleAddTask}
      />
    </div>
  );
}
