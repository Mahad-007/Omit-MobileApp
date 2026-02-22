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

import { 
  Sun, 
  Sunset, 
  Moon, 
  Settings as SettingsIcon,
  Shield, 
  Eye, 
  Play, 
  LayoutGrid, 
  Ban, 
  Plus, 
  CheckCircle2, 
  ArrowRight, 
  ListPlus, 
  TrendingUp,
  Camera, 
  Music, 
  AtSign, 
  Users, 
  PlayCircle, 
  Film, 
  Gamepad2, 
  MessageSquare,
  Sparkles,
  Zap,
  Timer
} from "lucide-react";

interface InstalledAppWithStatus extends AppInfo {
  blockMode: 'off' | 'session' | 'persistent';
}

// App icons mapping
const appIcons: Record<string, { icon:  React.ElementType; color: string }> = {
  'instagram.com': { icon: Camera, color: 'bg-gradient-to-br from-purple-500 to-pink-500' },
  'tiktok.com': { icon: Music, color: 'bg-gradient-to-br from-cyan-400 to-pink-500' },
  'twitter.com': { icon: AtSign, color: 'bg-sky-500' },
  'facebook.com': { icon: Users, color: 'bg-blue-600' },
  'youtube.com': { icon: PlayCircle, color: 'bg-red-500' },
  'netflix.com': { icon: Film, color: 'bg-red-600' },
  'twitch.tv': { icon: Gamepad2, color: 'bg-purple-600' },
  'reddit.com': { icon: MessageSquare, color: 'bg-orange-500' },
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
      // Use remainingMs for paused sessions instead of stale endTime
      const remaining = session.pausedAt
        ? Math.max(0, session.remainingMs || 0)
        : Math.max(0, session.endTime - Date.now());
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
        // Don't tick down if session is paused
        if (session.pausedAt) return;
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
    // Use storage.toggleAppBlock to ensure local state and side effects (like extension sync) are handled
    const updatedApp = storage.toggleAppBlock(id);
    if (!updatedApp) {
      toast.error("App not found");
    }
    // No need to manually call toggle.mutateAsync, storage.toggleAppBlock handles the API call
  };

  const handleAddTask = async (newTask: Omit<Task, 'id' | 'completed' | 'createdAt'>) => {
    // Prevent duplicate active tasks
    const isDuplicate = tasks.some(t => 
      !t.completed && 
      t.title.trim().toLowerCase() === newTask.title.trim().toLowerCase()
    );

    if (isDuplicate) {
      toast.error("A similar task already exists!");
      return;
    }

    try {
      await createTask.mutateAsync(newTask);
    } catch (error) {
      toast.error("Failed to create task");
    }
  };
  
  // Logic for greeting and date
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const GreetingIcon = hour < 12 ? Sun : hour < 18 ? Sunset : Moon;
  
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
    <div className="flex flex-col min-h-screen pb-24 relative overflow-hidden bg-background">
      {/* Background Gradient Mesh */}
      <div className="absolute inset-0 bg-mesh opacity-40 pointer-events-none" />
      <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-primary/20 blur-[100px] rounded-full pointer-events-none -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-sky-500/10 blur-[100px] rounded-full pointer-events-none translate-y-1/2 -translate-x-1/2" />

      {/* Header Section */}
      <header className="relative flex items-center safe-area-top pt-8 px-6 pb-6 justify-between animate-fade-up z-10">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium">
            <GreetingIcon className="w-4 h-4" />
            <span>{greeting}</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight gradient-text">
            {displayName}
          </h1>
        </div>
        
        <div className="flex items-center gap-3">
           <button 
             onClick={() => navigate('/settings')}
             className="w-10 h-10 flex items-center justify-center rounded-2xl bg-white/50 backdrop-blur-md border border-white/20 text-foreground hover:bg-white/80 transition-all active:scale-95 shadow-sm"
             aria-label="Settings"
           >
             <SettingsIcon className="w-5 h-5" />
           </button>
        </div>
      </header>

      {/* ===== FOCUS STATUS HERO CARD ===== */}
      <section className="px-6 mb-8 animate-fade-up stagger-1 z-10 relative">
        <div 
          className={cn(
            "relative overflow-hidden rounded-3xl p-6 transition-all duration-300 group",
            focusModeActive 
              ? "bg-black text-white shadow-glow-lg" 
              : "zen-card"
          )}
        >
          {/* Animated background for active state */}
          {focusModeActive && (
             <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900 animate-aurora opacity-50" />
          )}

          <div className="relative z-10 flex flex-col gap-6">
            <div className="flex items-start justify-between">
               <div className="flex flex-col gap-1">
                  <h2 className={cn("text-lg font-bold", focusModeActive ? "text-white" : "text-foreground")}>
                      {focusModeActive ? "Focus Mode Active" : "Ready to Focus?"}
                  </h2>
                  <p className={cn("text-xs font-medium", focusModeActive ? "text-gray-400" : "text-muted-foreground")}>
                     {focusModeActive ? "Keep going, you're doing great!" : "Block distractions and get in the zone."}
                  </p>
               </div>
               <div className={cn("p-2 rounded-xl", focusModeActive ? "bg-white/10" : "bg-primary/10")}>
                  {focusModeActive ? <Zap className="w-5 h-5 text-yellow-400 fill-yellow-400" /> : <Sparkles className="w-5 h-5 text-primary" />}
               </div>     
            </div>

            <div className="flex items-end justify-between">
              <div className="flex flex-col">
                  {focusModeActive ? (
                     <span className="text-4xl font-bold tracking-tighter font-mono text-white">
                        {formatTime(timeRemaining)}
                     </span>
                  ) : (
                    <div className="flex -space-x-3">
                       {[...Array(3)].map((_, i) => (
                          <div key={i} className={cn("w-8 h-8 rounded-full border-2 flex items-center justify-center text-[10px] font-bold", focusModeActive ? "border-black bg-gray-800" : "border-white bg-gray-100")}>
                             {i === 2 ? `+${enabledApps.length > 2 ? enabledApps.length - 2 : 1}` : <Ban className="w-3 h-3 text-muted-foreground" />}
                          </div>
                       ))}
                    </div>
                  )}
                  <span className={cn("text-xs mt-2 font-medium self-start px-2 py-0.5 rounded-full", focusModeActive ? "bg-white/10 text-white/80" : "bg-primary/10 text-primary")}>
                    {focusModeActive ? "Session in progress" : `${enabledApps.length} Apps blocked`}
                  </span>
              </div>

              <button 
                onClick={handleStartFocus}
                className={cn(
                  "h-12 px-8 rounded-2xl font-bold text-sm hover:scale-105 active:scale-95 flex items-center gap-2 transition-all shadow-lg",
                  focusModeActive 
                    ? "bg-white text-black hover:bg-gray-100" 
                    : "bg-primary text-white hover:brightness-110 shadow-glow"
                )}
              >
                {focusModeActive ? <Eye className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                <span>{focusModeActive ? 'View' : 'Start Session'}</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ===== BLOCKED APPS QUICK ACCESS ===== */}
      {/* ===== BLOCKED APPS QUICK ACCESS ===== */}
      {(!onAndroid || (onAndroid && permissions?.allGranted)) && (
        <section className="animate-fade-up stagger-2 mb-8">
          <div className="flex items-center justify-between mb-4 px-6">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
               <Shield className="w-4 h-4 text-primary" />
               Blocked Apps
            </h3>
            <button 
              onClick={() => navigate('/blocker')}
              className="text-primary text-xs font-bold bg-primary/10 px-3 py-1.5 rounded-full hover:bg-primary/20 transition-colors"
            >
              Manage
            </button>
          </div>
          
          <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 px-6 snap-x">
            {onAndroid ? (
              // Android: Show installed apps
              installedApps.slice(0, 7).map((app) => {
                 const isBlocked = app.blockMode !== 'off';
                 return (
                   <button 
                     key={app.packageName}
                     onClick={() => {
                        let nextMode: 'off' | 'session' | 'persistent' = 'session';
                        if (app.blockMode === 'session') nextMode = 'persistent';
                        else if (app.blockMode === 'persistent') nextMode = 'off';
                        storage.toggleAndroidApp(app.packageName, nextMode);
                        // Force refresh local state
                        loadInstalledApps();
                     }}
                     className="flex flex-col items-center gap-2 min-w-[64px] snap-start group"
                   >
                     <div className={cn(
                       "size-16 rounded-2xl flex items-center justify-center shadow-sm relative transition-all active:scale-95 duration-200 border border-transparent",
                       isBlocked ? "bg-white ring-2 ring-primary ring-offset-2 shadow-md" : "bg-white text-muted-foreground border-border opacity-70"
                     )}>
                        {app.icon ? (
                          <img src={`data:image/png;base64,${app.icon}`} alt={app.appName} className="size-8 object-contain" />
                        ) : (
                          <Ban className="w-6 h-6 text-muted-foreground" />
                        )}
                        
                        {/* Status Indicator Badge */}
                        {isBlocked && (
                          <div className={cn(
                            "absolute -top-1 -right-1 size-5 rounded-full border-[2px] border-white flex items-center justify-center shadow-sm z-10",
                            app.blockMode === 'persistent' ? "bg-red-500" : "bg-primary"
                          )}>
                             {app.blockMode === 'persistent' ? <Ban className="w-3 h-3 text-white" /> : <CheckCircle2 className="w-3 h-3 text-white" />}
                          </div>
                        )}
                     </div>
                     <span className="text-[10px] font-medium text-muted-foreground truncate w-full text-center px-1">
                       {app.appName}
                     </span>
                   </button>
                 );
               })
            ) : (
              // Web: Show blocked URL apps
              blockedApps.slice(0, 5).map((app) => {
                const iconData = appIcons[app.url] || { icon: Ban, color: 'bg-muted' };
                return (
                  <button
                    key={app.id}
                    onClick={() => toggleApp(app.id)}
                    className="flex flex-col items-center gap-2 min-w-[64px] snap-start"
                  >
                    <div className={cn(
                      "size-16 rounded-2xl flex items-center justify-center shadow-sm relative transition-all active:scale-90 duration-200 border border-transparent",
                      app.isEnabled 
                        ? "bg-white text-primary ring-2 ring-primary ring-offset-2 shadow-md" 
                        : "bg-white text-muted-foreground border-border"
                    )}>
                      <iconData.icon className="w-7 h-7" />
                      {app.isEnabled && (
                        <div className="absolute -top-1 -right-1 size-5 bg-primary rounded-full flex items-center justify-center border-2 border-white">
                          <CheckCircle2 className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] font-medium text-muted-foreground truncate w-full text-center">
                      {app.url.split('.')[0]}
                    </span>
                  </button>
                );
              })
            )}
            
            {/* Add More Button */}
            <button
              onClick={() => navigate('/blocker')}
              className="flex flex-col items-center gap-2 min-w-[64px] snap-start"
            >
              <div className="size-16 rounded-2xl bg-muted/50 border-2 border-dashed border-border flex items-center justify-center active:scale-95 transition-all hover:border-primary/50 hover:bg-primary/5">
                <Plus className="w-6 h-6 text-muted-foreground" />
              </div>
              <span className="text-[10px] font-medium text-muted-foreground">Add App</span>
            </button>
          </div>
        </section>
      )}

      {/* ===== STATS ROW ===== */}
      <section className="px-6 mb-8 animate-fade-up stagger-3">
          <div className="grid grid-cols-2 gap-4">
            <div className="zen-card p-5 flex flex-col justify-between h-32 relative overflow-hidden group">
                <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                   <Timer className="w-16 h-16" />
                </div>
                <div className="flex items-center gap-2">
                   <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-full text-indigo-600 dark:text-indigo-400">
                      <Timer className="w-4 h-4" />
                   </div>
                   <span className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Focus Time</span>
                </div>
                <div>
                  <p className="text-3xl font-bold text-foreground tracking-tight">
                      {focusHours.toFixed(1)}<span className="text-sm text-muted-foreground font-medium ml-1">h</span>
                  </p>
                </div>
            </div>

            <div className="zen-card p-5 flex flex-col justify-between h-32 relative overflow-hidden group">
                <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                   <Shield className="w-16 h-16" />
                </div>
                <div className="flex items-center gap-2">
                   <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-full text-emerald-600 dark:text-emerald-400">
                      <Shield className="w-4 h-4" />
                   </div>
                   <span className="text-muted-foreground text-xs font-bold uppercase tracking-wider">Protected</span>
                </div>
                <div>
                   <p className="text-3xl font-bold text-foreground tracking-tight">
                      {enabledApps.length} <span className="text-sm text-muted-foreground font-medium">apps</span>
                   </p>
                </div>
            </div>
          </div>
      </section>

      {/* ===== TASKS SECTION ===== */}
      <section className="px-6 mb-24 animate-fade-up stagger-4">
        <div className="flex items-center justify-between mb-4">
           <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" />
              Tasks
           </h3>
           <span className="text-xs font-bold text-muted-foreground bg-secondary px-2 py-1 rounded-md">
             {completedTasks}/{totalTasks}
           </span>
        </div>

        {priorityTask ? (
          <div className="glass-premium rounded-3xl p-1 shadow-sm">
            <div className="bg-gradient-to-br from-white/80 to-white/40 dark:from-white/5 dark:to-transparent rounded-[20px] p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <button 
                  className={cn(
                    "size-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                    priorityTask.completed 
                      ? "bg-primary border-primary" 
                      : "border-muted-foreground/30 hover:border-primary"
                  )}
                  onClick={() => {/* Toggle logic would go here if direct toggle was enabled */}}
                >
                  {priorityTask.completed && <CheckCircle2 className="w-4 h-4 text-white" />}
                </button>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{priorityTask.title}</p>
                   {priorityTask.dueDate && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                      <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
                        {new Date(priorityTask.dueDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    </div>
                  )}
                </div>
              </div>
              
              <button 
                onClick={() => navigate('/tasks')}
                className="size-10 flex items-center justify-center rounded-xl bg-secondary text-foreground hover:bg-secondary/80 active:scale-95 transition-all"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        ) : (
          <button 
            onClick={() => setShowAddModal(true)}
            className="w-full py-8 rounded-3xl border-2 border-dashed border-border hover:border-primary/50 bg-secondary/30 hover:bg-secondary/50 transition-all flex flex-col items-center justify-center gap-2 group cursor-pointer"
          >
             <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <Plus className="w-6 h-6 text-primary" />
             </div>
             <span className="text-sm font-medium text-muted-foreground group-hover:text-primary transition-colors">Add your first task</span>
          </button>
        )}

        {/* Task Progress Bar */}
        {totalTasks > 0 && (
          <div className="mt-6">
             <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
               <div 
                 className="h-full rounded-full bg-gradient-to-r from-primary to-purple-500 transition-all duration-700 ease-out shadow-glow" 
                 style={{ width: `${progressPercent}%` }}
               />
             </div>
             <p className="text-center text-[10px] font-bold text-muted-foreground mt-2 uppercase tracking-widest">{progressPercent}% Completed</p>
          </div>
        )}
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
